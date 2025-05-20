// __mocks__/react-native-svg.tsx
// This is a mock for react-native-svg to be used in Jest tests.

import React, { type PropsWithChildren } from 'react';

const createComponent = (name: string) => {
  return class extends React.Component<PropsWithChildren> {
    static displayName = name;
    render() {
      // Render as a simple div or the tag name for testing purposes
      return React.createElement(name, this.props, this.props.children);
    }
  };
};

const Svg = createComponent('Svg');
const Circle = createComponent('Circle');
const Ellipse = createComponent('Ellipse');
const G = createComponent('G');
const Text = createComponent('Text');
const TextPath = createComponent('TextPath');
const TSpan = createComponent('TSpan');
const Path = createComponent('Path');
const Polygon = createComponent('Polygon');
const Polyline = createComponent('Polyline');
const Line = createComponent('Line');
const Rect = createComponent('Rect');
const Use = createComponent('Use');
const Image = createComponent('Image');
const Symbol = createComponent('Symbol');
const Defs = createComponent('Defs');
const LinearGradient = createComponent('LinearGradient');
const RadialGradient = createComponent('RadialGradient');
const Stop = createComponent('Stop');
const ClipPath = createComponent('ClipPath');
const Pattern = createComponent('Pattern');
const Mask = createComponent('Mask');

export {
  Svg,
  Circle,
  Ellipse,
  G,
  Text,
  TextPath,
  TSpan,
  Path,
  Polygon,
  Polyline,
  Line,
  Rect,
  Use,
  Image,
  Symbol,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  ClipPath,
  Pattern,
  Mask,
};

export default Svg; 