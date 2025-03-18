/**
 * Types for the antgallery application
 */

// User profile
export interface UserProfile {
    name: string;
    profileImage: string | null;
    apiEndpoint: string;
}

// Image metadata
export interface ImageMetadata {
    [key: string]: string | string[] | number | boolean;
}

// Image definition
export interface Image {
    id: string;
    url: string;
    title: string;
    metadata: ImageMetadata;
}

// Collection of images
export interface Collection {
    id: string;
    name: string;
    description: string;
    imageIds: string[]; // Ordered array of image IDs
    created: number; // timestamp
    updated: number; // timestamp
}

// Slideshow settings
export interface SlideshowSettings {
    collectionId: string | null;
    interval: number; // in seconds
    transition: TransitionType;
    randomOrder: boolean;
}

// Available transition types
export enum TransitionType {
    FADE = 'fade',
    SLIDE = 'slide',
    ZOOM = 'zoom',
    FLIP = 'flip',
    RANDOM = 'random'
}

// App language
export enum Language {
    EN = 'en',
    DE = 'de'
} 