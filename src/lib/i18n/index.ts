import { addMessages, init, getLocaleFromNavigator } from 'svelte-i18n';
import { derived } from 'svelte/store';
import { language } from '$lib/stores';
import { Language } from '$lib/types';
import { browser } from '$app/environment';

// Load translations
import en from './en';
import de from './de';

// Register translations
addMessages('en', en);
addMessages('de', de);

// Initialize i18n function that can be called from components
export function initI18n() {
    // Try to get language from localStorage first
    let initialLocale = 'en';
    
    if (browser) {
        const storedLang = localStorage.getItem('language');
        initialLocale = storedLang || getLocaleFromNavigator() || 'en';
    }
    
    // Initialize svelte-i18n
    init({
        fallbackLocale: 'en',
        initialLocale
    });
    
    // Link our language store to svelte-i18n
    language.subscribe(lang => {
        if (lang === Language.EN) {
            init({ 
                fallbackLocale: 'en',
                initialLocale: 'en' 
            });
        } else if (lang === Language.DE) {
            init({ 
                fallbackLocale: 'en',
                initialLocale: 'de' 
            });
        }
    });
}

// Initialize svelte-i18n with default settings (will be replaced by initI18n call)
init({
    fallbackLocale: 'en',
    initialLocale: getLocaleFromNavigator() || 'en'
});

// Legacy language linking (will be replaced by initI18n call)
language.subscribe(lang => {
    if (lang === Language.EN) {
        init({ 
            fallbackLocale: 'en',
            initialLocale: 'en' 
        });
    } else if (lang === Language.DE) {
        init({ 
            fallbackLocale: 'en',
            initialLocale: 'de' 
        });
    }
}); 