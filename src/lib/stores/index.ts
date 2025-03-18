import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { v4 as uuidv4 } from 'uuid';
import type { UserProfile, Image, Collection, SlideshowSettings } from '$lib/types';
import { TransitionType, Language } from '$lib/types';

// Default values
const DEFAULT_API_ENDPOINT = 'http://localhost:17017/v0/';

// Initialize dark mode store
const createDarkModeStore = () => {
    // Check if dark mode is enabled in localStorage or based on user preference
    const prefersDarkMode = browser && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode = browser && localStorage.getItem('darkMode') !== null
        ? localStorage.getItem('darkMode') === 'true'
        : prefersDarkMode;
    
    const { subscribe, set, update } = writable<boolean>(initialMode);
    
    return {
        subscribe,
        toggle: () => update(mode => !mode),
        enable: () => set(true),
        disable: () => set(false)
    };
};

// Initialize user profile store
const createUserProfileStore = () => {
    const defaultProfile: UserProfile = {
        name: '',
        profileImage: null,
        apiEndpoint: DEFAULT_API_ENDPOINT
    };
    
    // Load from local storage if available
    let initialProfile = defaultProfile;
    if (browser) {
        try {
            const savedProfile = localStorage.getItem('userProfile');
            if (savedProfile) {
                initialProfile = JSON.parse(savedProfile);
            } else {
                // If no profile exists, initialize it in localStorage
                localStorage.setItem('userProfile', JSON.stringify(defaultProfile));
            }
        } catch (error) {
            console.error('Error loading user profile from localStorage:', error);
            // In case of error, fallback to default profile
            localStorage.setItem('userProfile', JSON.stringify(defaultProfile));
        }
    }
    
    const { subscribe, set, update } = writable<UserProfile>(initialProfile);
    
    // Helper function to ensure localStorage is updated
    const persistToLocalStorage = (profile: UserProfile) => {
        if (browser) {
            try {
                localStorage.setItem('userProfile', JSON.stringify(profile));
            } catch (error) {
                console.error('Error saving user profile to localStorage:', error);
            }
        }
    };
    
    return {
        subscribe,
        updateName: (name: string) => {
            update(profile => {
                const updatedProfile = { ...profile, name };
                persistToLocalStorage(updatedProfile);
                return updatedProfile;
            });
        },
        updateProfileImage: (imageUrl: string | null) => {
            update(profile => {
                const updatedProfile = { ...profile, profileImage: imageUrl };
                persistToLocalStorage(updatedProfile);
                return updatedProfile;
            });
        },
        updateApiEndpoint: (endpoint: string) => {
            update(profile => {
                const updatedProfile = { ...profile, apiEndpoint: endpoint };
                persistToLocalStorage(updatedProfile);
                return updatedProfile;
            });
        },
        reset: () => {
            set(defaultProfile);
            persistToLocalStorage(defaultProfile);
        }
    };
};

// Initialize images store
const createImagesStore = () => {
    const initialImages = browser && localStorage.getItem('images')
        ? JSON.parse(localStorage.getItem('images') || '[]')
        : [];
    
    const { subscribe, set, update } = writable<Image[]>(initialImages);
    
    return {
        subscribe,
        addImage: (url: string, title: string, metadata: Record<string, any> = {}) => {
            const newImage: Image = {
                id: uuidv4(),
                url,
                title,
                metadata
            };
            
            update(images => [...images, newImage]);
            return newImage.id;
        },
        updateImage: (id: string, updates: Partial<Image>) => {
            update(images => images.map(img => img.id === id ? { ...img, ...updates } : img));
        },
        updateMetadata: (id: string, key: string, value: any) => {
            update(images => images.map(img => {
                if (img.id === id) {
                    return { 
                        ...img, 
                        metadata: { ...img.metadata, [key]: value } 
                    };
                }
                return img;
            }));
        },
        removeImage: (id: string) => {
            update(images => images.filter(img => img.id !== id));
        },
        getImageById: (id: string) => {
            const images = get({ subscribe });
            return images.find(img => img.id === id);
        }
    };
};

// Initialize collections store
const createCollectionsStore = () => {
    const initialCollections = browser && localStorage.getItem('collections')
        ? JSON.parse(localStorage.getItem('collections') || '[]')
        : [];
    
    const { subscribe, set, update } = writable<Collection[]>(initialCollections);
    
    return {
        subscribe,
        addCollection: (name: string, description: string = '') => {
            const newCollection: Collection = {
                id: uuidv4(),
                name,
                description,
                imageIds: [],
                created: Date.now(),
                updated: Date.now()
            };
            
            update(collections => [...collections, newCollection]);
            return newCollection.id;
        },
        updateCollection: (id: string, updates: Partial<Collection>) => {
            update(collections => collections.map(coll => {
                if (coll.id === id) {
                    return { 
                        ...coll, 
                        ...updates, 
                        updated: Date.now() 
                    };
                }
                return coll;
            }));
        },
        addImageToCollection: (collectionId: string, imageId: string) => {
            update(collections => collections.map(coll => {
                if (coll.id === collectionId && !coll.imageIds.includes(imageId)) {
                    return { 
                        ...coll, 
                        imageIds: [...coll.imageIds, imageId],
                        updated: Date.now() 
                    };
                }
                return coll;
            }));
        },
        removeImageFromCollection: (collectionId: string, imageId: string) => {
            update(collections => collections.map(coll => {
                if (coll.id === collectionId) {
                    return { 
                        ...coll, 
                        imageIds: coll.imageIds.filter(id => id !== imageId),
                        updated: Date.now() 
                    };
                }
                return coll;
            }));
        },
        reorderImages: (collectionId: string, newOrder: string[]) => {
            update(collections => collections.map(coll => {
                if (coll.id === collectionId) {
                    return { 
                        ...coll, 
                        imageIds: newOrder,
                        updated: Date.now() 
                    };
                }
                return coll;
            }));
        },
        removeCollection: (id: string) => {
            update(collections => collections.filter(coll => coll.id !== id));
        },
        getCollectionById: (id: string) => {
            const collections = get({ subscribe });
            return collections.find(coll => coll.id === id);
        }
    };
};

// Initialize slideshow settings store
const createSlideshowSettingsStore = () => {
    const defaultSettings: SlideshowSettings = {
        collectionId: null,
        interval: 5, // 5 seconds
        transition: TransitionType.FADE,
        randomOrder: false
    };
    
    const initialSettings = browser && localStorage.getItem('slideshowSettings')
        ? JSON.parse(localStorage.getItem('slideshowSettings') || '')
        : defaultSettings;
    
    const { subscribe, set, update } = writable<SlideshowSettings>(initialSettings);
    
    return {
        subscribe,
        setCollection: (collectionId: string | null) => update(settings => ({ ...settings, collectionId })),
        setInterval: (seconds: number) => update(settings => ({ ...settings, interval: seconds })),
        setTransition: (transition: TransitionType) => update(settings => ({ ...settings, transition })),
        setRandomOrder: (random: boolean) => update(settings => ({ ...settings, randomOrder: random })),
        reset: () => set(defaultSettings)
    };
};

// Language store
const createLanguageStore = () => {
    const initialLang = browser && localStorage.getItem('language')
        ? (localStorage.getItem('language') as Language)
        : Language.EN;
    
    const { subscribe, set } = writable<Language>(initialLang);
    
    return {
        subscribe,
        setLanguage: (lang: Language) => {
            if (browser) {
                localStorage.setItem('language', lang);
            }
            set(lang);
        }
    };
};

// Create stores
export const userProfile = createUserProfileStore();
export const images = createImagesStore();
export const collections = createCollectionsStore();
export const slideshowSettings = createSlideshowSettingsStore();
export const language = createLanguageStore();
export const darkMode = createDarkModeStore();

// Save stores to localStorage when they change
if (browser) {
    // Note: userProfile now handles its own localStorage updates
    
    images.subscribe(value => {
        localStorage.setItem('images', JSON.stringify(value));
    });
    
    collections.subscribe(value => {
        localStorage.setItem('collections', JSON.stringify(value));
    });
    
    slideshowSettings.subscribe(value => {
        localStorage.setItem('slideshowSettings', JSON.stringify(value));
    });
    
    darkMode.subscribe(value => {
        localStorage.setItem('darkMode', String(value));
    });
} 