// src/lib/avatars/avatarRegistry.ts
export interface AvatarAsset {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const AVATAR_REGISTRY: AvatarAsset[] = [
  {
    id: 'asian-woman',
    name: 'Asian Woman',
    url: '/avatars/asian-woman.png',
    description: 'Professional Asian woman with warm smile'
  },
  {
    id: 'black-man', 
    name: 'Black Man',
    url: '/avatars/black-man.png',
    description: 'Friendly Black man with casual style'
  },
  {
    id: 'hispanic-man',
    name: 'Hispanic Man', 
    url: '/avatars/hispanic-man.png',
    description: 'Professional Hispanic man with confident expression'
  },
  {
    id: 'middle-eastern-man',
    name: 'Middle Eastern Man',
    url: '/avatars/middle-eastern-man.png', 
    description: 'Professional Middle Eastern man with business style'
  },
  {
    id: 'white-woman',
    name: 'White Woman',
    url: '/avatars/white-woman.png',
    description: 'Friendly white woman with bright smile'
  }
];

// Simple utility functions
export const getAvatarById = (id: string): AvatarAsset | undefined => {
  return AVATAR_REGISTRY.find(avatar => avatar.id === id);
};

export const getAllAvatars = (): AvatarAsset[] => {
  return AVATAR_REGISTRY;
};

export const getRandomAvatar = (): AvatarAsset => {
  return AVATAR_REGISTRY[Math.floor(Math.random() * AVATAR_REGISTRY.length)]!;
}; 