export function OrgSidebar({ 
  // ... existing code ...
}: OrgSidebarProps) {
  // ... existing code ...

  // All menu items that can be rendered in the sidebar
  const menuItems = [
    // ... existing code ...
    
    // For organizational groups add an affiliation menu item
    // This should come after permissions checks/apps section if they exist
    {
      title: "Organization",
      items: [
        {
          title: "Organization Affiliations",
          href: `/${orgSlug}/affiliations`,
          icon: Network,
          items: [],
        },
        // ... other organization items ...
      ],
    },
    
    // ... existing code ...
  ];

  // ... existing code ...
} 