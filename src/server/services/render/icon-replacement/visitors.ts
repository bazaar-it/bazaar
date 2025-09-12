import * as t from '@babel/types';

type SvgDef = { attributes: Record<string, string>, body: string };

export function buildIconVisitors(
  iconMap: Map<string, SvgDef>,
  needsRuntimeMap: boolean,
  toDangerousInnerHTML: (body: string) => t.ObjectExpression,
) {
  // Helper for JSX: convert <IconifyIcon icon="set:name" .../> to <svg ... dangerouslySetInnerHTML={{__html:body}} />
  const JSXElement = (path: any) => {
    try {
      const node = path.node;
      if (!node || !node.openingElement) return;

      const opening = node.openingElement;

      const getJsxName = (n: t.JSXIdentifier | t.JSXMemberExpression): string => {
        if (t.isJSXIdentifier(n)) return n.name;
        if (t.isJSXMemberExpression(n)) {
          const obj = getJsxName(n.object as any);
          const prop = getJsxName(n.property as any);
          return `${obj}.${prop}`;
        }
        return '';
      };

      const elementName = getJsxName(opening.name as any);
      if (!elementName.endsWith('IconifyIcon')) return;

      const iconAttr = opening.attributes.find(
        (a: any): a is t.JSXAttribute =>
          t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: 'icon' })
      );
      if (!iconAttr) return;

      if (t.isStringLiteral(iconAttr.value)) {
        const iconName = iconAttr.value.value;
        const svg = iconMap.get(iconName);
        if (!svg) return;

        const svgAttrs: t.JSXAttribute[] = [
          ...Object.entries(svg.attributes).map(([k, v]) =>
            t.jsxAttribute(t.jsxIdentifier(k), t.stringLiteral(v))
          ),
          t.jsxAttribute(t.jsxIdentifier('fill'), t.stringLiteral('currentColor')),
          t.jsxAttribute(t.jsxIdentifier('width'), t.stringLiteral('1em')),
          t.jsxAttribute(t.jsxIdentifier('height'), t.stringLiteral('1em')),
          t.jsxAttribute(
            t.jsxIdentifier('dangerouslySetInnerHTML'),
            t.jsxExpressionContainer(toDangerousInnerHTML(svg.body))
          ),
        ];
        for (const attr of opening.attributes) {
          if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name !== 'icon') {
            svgAttrs.push(attr);
          }
        }
        path.replaceWith(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier('svg'), svgAttrs, true),
            null,
            [],
            true
          )
        );
      } else if (t.isJSXExpressionContainer(iconAttr.value)) {
        if (needsRuntimeMap) {
          opening.name = t.jsxIdentifier('__InlineIcon');
        }
      }
    } catch (err) {
      // keep traversal going
      console.error('[Icon Replace] Error in JSXElement visitor:', err);
    }
  };

  // Helper for CallExpression: React.createElement(window.IconifyIcon, {...}) and IconifyIcon({...})
  const CallExpression = (path: any) => {
    try {
      const callee = path.node.callee;

      // React.createElement(IconifyIcon, props)
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, { name: 'React' }) &&
        t.isIdentifier(callee.property, { name: 'createElement' })
      ) {
        const [comp, props] = path.node.arguments;
        if (!t.isObjectExpression(props)) return;

        const isIconifyComponent =
          (t.isIdentifier(comp, { name: 'IconifyIcon' })) ||
          (t.isMemberExpression(comp) && t.isIdentifier(comp.object, { name: 'window' }) && t.isIdentifier(comp.property, { name: 'IconifyIcon' }));
        if (!isIconifyComponent) return;

        const iconProp = props.properties.find(
          (p: any): p is t.ObjectProperty =>
            t.isObjectProperty(p) &&
            ((t.isIdentifier(p.key, { name: 'icon' }) ||
              (t.isStringLiteral(p.key) && p.key.value === 'icon')))
        );
        if (!iconProp) return;

        if (t.isStringLiteral(iconProp.value)) {
          const iconName = iconProp.value.value;
          const svg = iconMap.get(iconName);
          if (!svg) return;

          const svgProps: t.ObjectProperty[] = [
            ...Object.entries(svg.attributes).map(([k, v]) =>
              t.objectProperty(t.identifier(k), t.stringLiteral(v))
            ),
            t.objectProperty(t.identifier('fill'), t.stringLiteral('currentColor')),
            t.objectProperty(t.identifier('width'), t.stringLiteral('1em')),
            t.objectProperty(t.identifier('height'), t.stringLiteral('1em')),
            t.objectProperty(
              t.identifier('dangerouslySetInnerHTML'),
              toDangerousInnerHTML(svg.body)
            ),
          ];
          for (const prop of props.properties) {
            if (
              t.isObjectProperty(prop) &&
              !(
                (t.isIdentifier(prop.key) && prop.key.name === 'icon') ||
                (t.isStringLiteral(prop.key) && prop.key.value === 'icon')
              )
            ) {
              svgProps.push(prop);
            }
          }
          path.replaceWith(
            t.callExpression(
              t.memberExpression(t.identifier('React'), t.identifier('createElement')),
              [t.stringLiteral('svg'), t.objectExpression(svgProps)]
            )
          );
          return;
        } else if (needsRuntimeMap) {
          path.node.arguments[0] = t.identifier('__InlineIcon');
          return;
        }
      }

      // Direct call: IconifyIcon({...}) or window.IconifyIcon({...})
      const isDirectIconifyCall =
        (t.isIdentifier(callee, { name: 'IconifyIcon' })) ||
        (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'window' }) && t.isIdentifier(callee.property, { name: 'IconifyIcon' }));
      if (!isDirectIconifyCall) return;

      const [props] = path.node.arguments;
      if (!t.isObjectExpression(props)) return;

      const iconProp = props.properties.find(
        (p: any): p is t.ObjectProperty =>
          t.isObjectProperty(p) &&
          ((t.isIdentifier(p.key, { name: 'icon' }) ||
            (t.isStringLiteral(p.key) && p.key.value === 'icon')))
      );
      if (!iconProp) return;

      if (t.isStringLiteral(iconProp.value)) {
        const iconName = iconProp.value.value;
        const svg = iconMap.get(iconName);
        if (!svg) return;

        const svgProps: t.ObjectProperty[] = [
          ...Object.entries(svg.attributes).map(([k, v]) =>
            t.objectProperty(t.identifier(k), t.stringLiteral(v))
          ),
          t.objectProperty(t.identifier('fill'), t.stringLiteral('currentColor')),
          t.objectProperty(t.identifier('width'), t.stringLiteral('1em')),
          t.objectProperty(t.identifier('height'), t.stringLiteral('1em')),
          t.objectProperty(
            t.identifier('dangerouslySetInnerHTML'),
            toDangerousInnerHTML(svg.body)
          ),
        ];
        for (const prop of props.properties) {
          if (
            t.isObjectProperty(prop) &&
            !(
              (t.isIdentifier(prop.key) && prop.key.name === 'icon') ||
              (t.isStringLiteral(prop.key) && prop.key.value === 'icon')
            )
          ) {
            svgProps.push(prop);
          }
        }
        path.replaceWith(
          t.callExpression(
            t.memberExpression(t.identifier('React'), t.identifier('createElement')),
            [t.stringLiteral('svg'), t.objectExpression(svgProps)]
          )
        );
        return;
      } else if (needsRuntimeMap) {
        path.node.callee = t.identifier('__InlineIcon');
        return;
      }
    } catch (err) {
      console.error('[Icon Replace] Error in CallExpression visitor:', err);
    }
  };

  return { JSXElement, CallExpression };
}

