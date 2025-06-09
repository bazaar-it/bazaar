/**
 * Comprehensive Flowbite Component Mapping System
 * Based on official Flowbite React component library
 * Two-tier approach: atomic components and layout templates
 */

/**
 * Atomic Flowbite components - direct imports from flowbite-react
 * Based on official Flowbite component library
 */
export const flowbiteAtomicMap = {
  // === FORM INPUT COMPONENTS ===
  TextInput: { import: 'TextInput', from: 'flowbite-react' },
  FileInput: { import: 'FileInput', from: 'flowbite-react' },
  SearchInput: { import: 'TextInput', from: 'flowbite-react' }, // TextInput with search styling
  NumberInput: { import: 'TextInput', from: 'flowbite-react' }, // TextInput with number type
  PhoneInput: { import: 'TextInput', from: 'flowbite-react' }, // TextInput with tel type
  Select: { import: 'Select', from: 'flowbite-react' },
  Textarea: { import: 'Textarea', from: 'flowbite-react' },
  Timepicker: { import: 'Datepicker', from: 'flowbite-react' }, // Datepicker in time mode
  Checkbox: { import: 'Checkbox', from: 'flowbite-react' },
  Radio: { import: 'Radio', from: 'flowbite-react' },
  Toggle: { import: 'ToggleSwitch', from: 'flowbite-react' },
  Range: { import: 'RangeSlider', from: 'flowbite-react' },
  FloatingLabel: { import: 'FloatingLabel', from: 'flowbite-react' },
  Label: { import: 'Label', from: 'flowbite-react' },
  
  // === GENERAL UI COMPONENTS ===
  Alert: { import: 'Alert', from: 'flowbite-react' },
  Accordion: { import: 'Accordion', from: 'flowbite-react' },
  Avatar: { import: 'Avatar', from: 'flowbite-react' },
  Badge: { import: 'Badge', from: 'flowbite-react' },
  Banner: { import: 'Banner', from: 'flowbite-react' },
  BottomNavigation: { import: 'BottomNavigation', from: 'flowbite-react' },
  Breadcrumb: { import: 'Breadcrumb', from: 'flowbite-react' },
  Button: { import: 'Button', from: 'flowbite-react' },
  ButtonGroup: { import: 'Button.Group', from: 'flowbite-react' },
  
  // === CONTENT CONTAINERS ===
  Card: { import: 'Card', from: 'flowbite-react' },
  Carousel: { import: 'Carousel', from: 'flowbite-react' },
  ChatBubble: { import: 'ChatBubble', from: 'flowbite-react' },
  Clipboard: { import: 'Clipboard', from: 'flowbite-react' },
  Datepicker: { import: 'Datepicker', from: 'flowbite-react' },
  DeviceMockup: { import: 'DeviceMockup', from: 'flowbite-react' },
  Drawer: { import: 'Drawer', from: 'flowbite-react' },
  Dropdown: { import: 'Dropdown', from: 'flowbite-react' },
  Footer: { import: 'Footer', from: 'flowbite-react' },
  Gallery: { import: 'Gallery', from: 'flowbite-react' },
  Indicator: { import: 'Indicator', from: 'flowbite-react' },
  Jumbotron: { import: 'Jumbotron', from: 'flowbite-react' },
  KBD: { import: 'KBD', from: 'flowbite-react' },
  ListGroup: { import: 'ListGroup', from: 'flowbite-react' },
  MegaMenu: { import: 'MegaMenu', from: 'flowbite-react' },
  
  // === INTERACTIVE ELEMENTS ===
  Modal: { import: 'Modal', from: 'flowbite-react' },
  Navbar: { import: 'Navbar', from: 'flowbite-react' },
  Pagination: { import: 'Pagination', from: 'flowbite-react' },
  Popover: { import: 'Popover', from: 'flowbite-react' },
  Progress: { import: 'Progress', from: 'flowbite-react' },
  Rating: { import: 'Rating', from: 'flowbite-react' },
  Sidebar: { import: 'Sidebar', from: 'flowbite-react' },
  Skeleton: { import: 'Skeleton', from: 'flowbite-react' },
  SpeedDial: { import: 'SpeedDial', from: 'flowbite-react' },
  Spinner: { import: 'Spinner', from: 'flowbite-react' },
  Stepper: { import: 'Stepper', from: 'flowbite-react' },
  Table: { import: 'Table', from: 'flowbite-react' },
  Tabs: { import: 'Tabs', from: 'flowbite-react' },
  Timeline: { import: 'Timeline', from: 'flowbite-react' },
  Toast: { import: 'Toast', from: 'flowbite-react' },
  Tooltip: { import: 'Tooltip', from: 'flowbite-react' },
  Typography: { import: 'Typography', from: 'flowbite-react' },
  Video: { import: 'Video', from: 'flowbite-react' },
  
} as const;

/**
 * Layout templates - mapped to actual Flowbite atomic components
 * These provide complex layouts using real Flowbite components
 */
export const flowbiteLayoutMap = {
  // === NAVIGATION LAYOUTS ===
  ApplicationShellWithSidebarAndNavbar: { 
    fallback: 'Sidebar', 
    import: 'Sidebar', 
    from: 'flowbite-react',
    description: 'Full app shell with sidebar and navbar - uses Sidebar component'
  },
  SideNavigationDefault: { 
    fallback: 'Sidebar', 
    import: 'Sidebar', 
    from: 'flowbite-react',
    description: 'Vertical sidebar menu - uses Sidebar component'
  },
  NavbarDefault: { 
    fallback: 'Navbar', 
    import: 'Navbar', 
    from: 'flowbite-react',
    description: 'Top navigation bar - uses Navbar component'
  },
  
  // === TABLE LAYOUTS ===
  TableDefault: { 
    fallback: 'Table', 
    import: 'Table', 
    from: 'flowbite-react',
    description: 'Feature-rich data table - uses Table component'
  },
  TableHeaderDefault: { 
    fallback: 'Table', 
    import: 'Table', 
    from: 'flowbite-react',
    description: 'Table with header - uses Table component'
  },
  TableHeaderWithButton: { 
    fallback: 'Table', 
    import: 'Table', 
    from: 'flowbite-react',
    description: 'Table header with action button - uses Table component'
  },
  TableFooter: { 
    fallback: 'Pagination', 
    import: 'Pagination', 
    from: 'flowbite-react',
    description: 'Table footer with pagination - uses Pagination component'
  },
  
  // === HERO SECTIONS ===
  HeroDefault: { 
    fallback: 'Jumbotron', 
    import: 'Jumbotron', 
    from: 'flowbite-react',
    description: 'Basic hero section - uses Jumbotron component'
  },
  HeroWithImage: { 
    fallback: 'Card', 
    import: 'Card', 
    from: 'flowbite-react',
    description: 'Hero with image - uses Card component'
  },
  
  // === MODAL LAYOUTS ===
  UpdateModalDefault: { 
    fallback: 'Modal', 
    import: 'Modal', 
    from: 'flowbite-react',
    description: 'Modal for editing data - uses Modal component'
  },
  CreateModalDefault: { 
    fallback: 'Modal', 
    import: 'Modal', 
    from: 'flowbite-react',
    description: 'Modal for creating new data - uses Modal component'
  },
  ReadModalDefault: { 
    fallback: 'Modal', 
    import: 'Modal', 
    from: 'flowbite-react',
    description: 'Modal for viewing data - uses Modal component'
  },
  DeleteConfirmationModal: { 
    fallback: 'Modal', 
    import: 'Modal', 
    from: 'flowbite-react',
    description: 'Confirmation dialog - uses Modal component'
  },
  
  // === DRAWER LAYOUTS ===
  DrawerDefault: { 
    fallback: 'Drawer', 
    import: 'Drawer', 
    from: 'flowbite-react',
    description: 'Basic sliding panel - uses Drawer component'
  },
  ReadDrawer: { 
    fallback: 'Drawer', 
    import: 'Drawer', 
    from: 'flowbite-react',
    description: 'Drawer for viewing details - uses Drawer component'
  },
  UpdateDrawer: { 
    fallback: 'Drawer', 
    import: 'Drawer', 
    from: 'flowbite-react',
    description: 'Drawer for editing - uses Drawer component'
  },
  
  // === FORM LAYOUTS ===
  CreateForm: { 
    fallback: 'Card', 
    import: 'Card', 
    from: 'flowbite-react',
    description: 'Form for creating entries - uses Card component'
  },
  UpdateForm: { 
    fallback: 'Card', 
    import: 'Card', 
    from: 'flowbite-react',
    description: 'Form for updating entries - uses Card component'
  },
  
  // === DASHBOARD LAYOUTS ===
  CrudLayoutDefault: { 
    fallback: 'Card', 
    import: 'Card', 
    from: 'flowbite-react',
    description: 'Full CRUD management layout - uses Card component'
  },
  DashboardFooterDefault: { 
    fallback: 'Footer', 
    import: 'Footer', 
    from: 'flowbite-react',
    description: 'Dashboard footer - uses Footer component'
  },
  
  // === SEARCH & FILTER LAYOUTS ===
  DropdownFilterDefault: { 
    fallback: 'Dropdown', 
    import: 'Dropdown', 
    from: 'flowbite-react',
    description: 'Dropdown filter control - uses Dropdown component'
  },
  FacetedSearchModal: { 
    fallback: 'Modal', 
    import: 'Modal', 
    from: 'flowbite-react',
    description: 'Advanced search modal - uses Modal component'
  },
  FacetedSearchDrawer: { 
    fallback: 'Drawer', 
    import: 'Drawer', 
    from: 'flowbite-react',
    description: 'Faceted search in drawer - uses Drawer component'
  },
  
  // === MESSAGE LAYOUTS ===
  SuccessMessageDefault: { 
    fallback: 'Alert', 
    import: 'Alert', 
    from: 'flowbite-react',
    description: 'Success confirmation message - uses Alert component'
  },
  
} as const;

/**
 * Type definitions for component maps
 */
export type FlowbiteAtomicComponent = keyof typeof flowbiteAtomicMap;
export type FlowbiteLayoutComponent = keyof typeof flowbiteLayoutMap;

/**
 * Check if a component name is a valid Flowbite atomic component
 */
export function isFlowbiteAtomic(name: string): name is FlowbiteAtomicComponent {
  return name in flowbiteAtomicMap;
}

/**
 * Check if a component name is a valid Flowbite layout component
 */
export function isFlowbiteLayout(name: string): name is FlowbiteLayoutComponent {
  return name in flowbiteLayoutMap;
}

/**
 * Get import information for a Flowbite atomic component
 */
export function getFlowbiteAtomicImport(name: FlowbiteAtomicComponent) {
  return flowbiteAtomicMap[name];
}

/**
 * Get path information for a Flowbite layout component
 */
export function getFlowbiteLayoutPath(name: FlowbiteLayoutComponent) {
  return flowbiteLayoutMap[name];
}

/**
 * Generate import statement for atomic component
 */
export function generateAtomicImport(name: FlowbiteAtomicComponent): string {
  const { import: componentName, from } = flowbiteAtomicMap[name];
  return `import { ${componentName} } from "${from}";`;
}

/**
 * Generate import statement for layout component (now uses fallback atomic components)
 */
export function generateLayoutImport(name: FlowbiteLayoutComponent): string {
  const layout = flowbiteLayoutMap[name];
  return `import { ${layout.import} } from "${layout.from}";`;
}

/**
 * Get the actual Flowbite component name for a layout template
 */
export function getLayoutFallbackComponent(name: FlowbiteLayoutComponent): string {
  return flowbiteLayoutMap[name].fallback;
}

/**
 * Convert props object to JSX prop string
 */
export function propString(props: Record<string, unknown> = {}): string {
  return Object.entries(props)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}="${value}"`;
      } else if (typeof value === 'boolean') {
        return value ? key : '';
      } else {
        return `${key}={${JSON.stringify(value)}}`;
      }
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Merge Tailwind classes from component spec
 */
export function classes(spec: { classes?: string[] }): string {
  return spec.classes?.join(' ') || '';
} 