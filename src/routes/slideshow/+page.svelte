<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { collections, images, slideshowSettings } from '$lib/stores';
    import { TransitionType } from '$lib/types';
    import type { Image } from '$lib/types';
    
    // Slideshow state
    let isPlaying = false;
    let currentIndex = 0;
    let slideshowImages: Image[] = [];
    let slideInterval: ReturnType<typeof setInterval> | null = null;
    
    // Settings form
    let selectedCollectionId = $slideshowSettings.collectionId;
    let interval = $slideshowSettings.interval;
    let transition = $slideshowSettings.transition;
    let randomOrder = $slideshowSettings.randomOrder;
    
    // UI state
    let showSettings = false;
    let isFullscreen = false;
    let slideshowContainer: HTMLElement;
    
    // Transition classes
    let currentTransition = '';
    let isTransitioning = false;
    
    // Get available transitions
    const transitions = Object.values(TransitionType);
    
    // Update slideshow images when collection changes
    $: if (selectedCollectionId) {
        const collection = $collections.find(c => c.id === selectedCollectionId);
        if (collection) {
            slideshowImages = collection.imageIds
                .map(id => $images.find(img => img.id === id))
                .filter(Boolean) as Image[];
            
            if (randomOrder) {
                shuffleImages();
            }
        }
    } else {
        slideshowImages = [];
    }
    
    // Shuffle images for random order
    function shuffleImages() {
        slideshowImages = [...slideshowImages].sort(() => Math.random() - 0.5);
    }
    
    // Save settings
    function saveSettings() {
        slideshowSettings.setCollection(selectedCollectionId);
        slideshowSettings.setInterval(interval);
        slideshowSettings.setTransition(transition);
        slideshowSettings.setRandomOrder(randomOrder);
        
        // If random order changed and we have images, shuffle them
        if (randomOrder && slideshowImages.length > 0) {
            shuffleImages();
        }
        
        showSettings = false;
    }
    
    // Cancel settings
    function cancelSettings() {
        // Revert to stored settings
        selectedCollectionId = $slideshowSettings.collectionId;
        interval = $slideshowSettings.interval;
        transition = $slideshowSettings.transition;
        randomOrder = $slideshowSettings.randomOrder;
        
        showSettings = false;
    }
    
    // Start slideshow
    async function startSlideshow() {
        if (!selectedCollectionId || slideshowImages.length === 0) return;
        
        // Enter fullscreen first
        if (!document.fullscreenElement) {
            try {
                await slideshowContainer.requestFullscreen();
                isFullscreen = true;
            } catch (err: any) {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            }
        }
        
        isPlaying = true;
        
        // Save settings first
        saveSettings();
        
        // Clear any existing interval
        if (slideInterval) {
            clearInterval(slideInterval);
        }
        
        // Set up the interval for changing slides
        slideInterval = setInterval(() => {
            nextSlide();
        }, interval * 1000);
    }
    
    // Stop slideshow
    function stopSlideshow() {
        isPlaying = false;
        
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }
    }
    
    // Go to next slide
    function nextSlide() {
        if (slideshowImages.length === 0) return;
        
        // Apply transition
        applyTransition();
        
        // After transition delay, change the slide
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % slideshowImages.length;
            isTransitioning = false;
            
            // If still playing, reset the interval to ensure consistent timing
            if (isPlaying) {
                if (slideInterval) {
                    clearInterval(slideInterval);
                }
                slideInterval = setInterval(() => {
                    nextSlide();
                }, interval * 1000);
            }
        }, 500); // Half a second for transition
    }
    
    // Go to previous slide
    function prevSlide() {
        if (slideshowImages.length === 0) return;
        
        // Apply transition
        applyTransition();
        
        // After transition delay, change the slide
        setTimeout(() => {
            currentIndex = (currentIndex - 1 + slideshowImages.length) % slideshowImages.length;
            isTransitioning = false;
            
            // If still playing, reset the interval to ensure consistent timing
            if (isPlaying) {
                if (slideInterval) {
                    clearInterval(slideInterval);
                }
                slideInterval = setInterval(() => {
                    nextSlide();
                }, interval * 1000);
            }
        }, 500); // Half a second for transition
    }
    
    // Apply transition effect
    function applyTransition() {
        isTransitioning = true;
        
        if (transition === TransitionType.RANDOM) {
            // Pick a random transition except RANDOM
            const availableTransitions = transitions.filter(t => t !== TransitionType.RANDOM);
            currentTransition = availableTransitions[Math.floor(Math.random() * availableTransitions.length)];
        } else {
            currentTransition = transition;
        }
    }
    
    // Handle keyboard navigation
    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft') {
            prevSlide();
        } else if (event.key === 'ArrowRight') {
            nextSlide();
        } else if (event.key === 'Escape' && isFullscreen) {
            stopSlideshow();
            document.exitFullscreen().catch(console.error);
        }
    }
    
    // Handle click navigation
    function handleNavigationClick(event: MouseEvent) {
        const target = event.currentTarget as HTMLElement;
        if (target.classList.contains('nav-left')) {
            prevSlide();
        } else if (target.classList.contains('nav-right')) {
            nextSlide();
        }
    }
    
    // Listen for fullscreen change events and keyboard events
    onMount(() => {
        const handleFullscreenChange = () => {
            isFullscreen = !!document.fullscreenElement;
            if (!isFullscreen) {
                stopSlideshow();
            }
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleKeydown);
        
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleKeydown);
        };
    });
    
    // Clean up on component destroy
    onDestroy(() => {
        if (slideInterval) {
            clearInterval(slideInterval);
        }
    });
</script>

<div class="slideshow-container" bind:this={slideshowContainer}>
    <header class="slideshow-header">
        <div class="header-left">
            <h1>{$_('slideshow.title')}</h1>
        </div>
        
        <div class="header-center">
            {#if !showSettings}
                <div class="collection-info">
                    {#if selectedCollectionId}
                        <h2>{$collections.find(c => c.id === selectedCollectionId)?.name}</h2>
                    {:else}
                        <h2>{$_('slideshow.noCollection')}</h2>
                    {/if}
                </div>
            {:else}
                <div class="settings-controls">
                    <div class="settings-group">
                        <select bind:value={selectedCollectionId}>
                            <option value={null}>{$_('slideshow.selectCollection')}</option>
                            {#each $collections as collection}
                                <option value={collection.id}>{collection.name}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <div class="settings-group">
                        <label>
                            <span>{$_('slideshow.interval')}</span>
                            <input type="number" bind:value={interval} min="1" max="60" />
                        </label>
                    </div>
                    
                    <div class="settings-group">
                        <label>
                            <span>{$_('slideshow.transition')}</span>
                            <select bind:value={transition}>
                                {#each transitions as t}
                                    <option value={t}>{$_(`transition.${t}`)}</option>
                                {/each}
                            </select>
                        </label>
                    </div>
                    
                    <div class="settings-group checkbox">
                        <label>
                            <input type="checkbox" bind:checked={randomOrder} />
                            <span>{$_('slideshow.randomOrder')}</span>
                        </label>
                    </div>
                    
                    <div class="settings-actions">
                        <button class="action-button save" on:click={saveSettings}>
                            {$_('common.save')}
                        </button>
                        <button class="action-button cancel" on:click={cancelSettings}>
                            {$_('common.cancel')}
                        </button>
                    </div>
                </div>
            {/if}
        </div>
        
        <div class="header-right">
            <button class="settings-toggle" on:click={() => showSettings = !showSettings}>
                {showSettings ? $_('common.cancel') : $_('common.edit')}
            </button>
            
            {#if isFullscreen}
                <button class="exit-fullscreen-button" on:click={() => document.exitFullscreen().catch(console.error)}>
                    {$_('slideshow.exitFullscreen')}
                </button>
            {:else if !isPlaying}
                <button class="start-button" on:click={startSlideshow}>
                    {$_('slideshow.startSlideshow')}
                </button>
            {:else}
                <button class="stop-button" on:click={stopSlideshow}>
                    {$_('slideshow.stopSlideshow')}
                </button>
            {/if}
        </div>
    </header>
    
    <div class="slideshow-content">
        {#if !selectedCollectionId || slideshowImages.length === 0}
            <div class="no-collection">
                <p>{$_('slideshow.noCollection')}</p>
                <button class="action-button" on:click={() => showSettings = true}>
                    {$_('slideshow.selectCollection')}
                </button>
            </div>
        {:else}
            <div class="slideshow-view">
                <!-- Navigation click areas -->
                <div 
                    class="nav-area nav-left" 
                    on:click={handleNavigationClick}
                    role="button"
                    tabindex="0"
                    on:keydown={(e) => e.key === 'Enter' && prevSlide()}
                ></div>
                <div 
                    class="nav-area nav-right"
                    on:click={handleNavigationClick}
                    role="button"
                    tabindex="0"
                    on:keydown={(e) => e.key === 'Enter' && nextSlide()}
                ></div>
                
                <div 
                    class="slide-container"
                    class:fade={currentTransition === TransitionType.FADE && isTransitioning}
                    class:slide={currentTransition === TransitionType.SLIDE && isTransitioning}
                    class:zoom={currentTransition === TransitionType.ZOOM && isTransitioning}
                    class:flip={currentTransition === TransitionType.FLIP && isTransitioning}
                >
                    <img 
                        src={slideshowImages[currentIndex]?.url} 
                        alt={slideshowImages[currentIndex]?.title}
                    />
                    
                    <div class="slide-info">
                        <h3>{slideshowImages[currentIndex]?.title}</h3>
                    </div>
                    
                    <div class="slideshow-controls">
                        <button class="control-button" on:click={prevSlide} disabled={isTransitioning}>
                            <span class="arrow">&larr;</span> <span class="text">{$_('slideshow.previous')}</span>
                        </button>
                        
                        {#if isPlaying}
                            <button class="control-button stop" on:click={stopSlideshow}>
                                {$_('slideshow.stop')}
                            </button>
                        {:else}
                            <button class="control-button play" on:click={startSlideshow}>
                                {$_('slideshow.start')}
                            </button>
                        {/if}
                        
                        <button class="control-button" on:click={nextSlide} disabled={isTransitioning}>
                            <span class="text">{$_('slideshow.next')}</span> <span class="arrow">&rarr;</span>
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .slideshow-container {
        width: 100%;
        height: calc(100vh - 12rem);
        display: flex;
        flex-direction: column;
    }
    
    .slideshow-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #1e1e1e;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
    }
    
    .header-left h1 {
        margin: 0;
        color: #f5f5f5;
        font-size: 1.5rem;
    }
    
    .header-center {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .collection-info h2 {
        margin: 0;
        color: #f5f5f5;
        font-size: 1.25rem;
        font-weight: 400;
    }
    
    .settings-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
        width: 100%;
        max-width: 800px;
    }
    
    .settings-group {
        display: flex;
        flex-direction: column;
    }
    
    .settings-group label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .settings-group label span {
        font-size: 0.9rem;
        color: #aaa;
    }
    
    .settings-group.checkbox label {
        flex-direction: row;
        align-items: center;
    }
    
    .settings-group.checkbox input {
        margin-right: 0.5rem;
    }
    
    .settings-group select,
    .settings-group input[type="number"] {
        padding: 0.5rem;
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        min-width: 150px;
    }
    
    .settings-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .header-right {
        display: flex;
        gap: 0.5rem;
    }
    
    .settings-toggle,
    .start-button,
    .stop-button,
    .action-button {
        padding: 0.5rem 1rem;
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.2s;
    }
    
    .settings-toggle:hover,
    .start-button:hover,
    .stop-button:hover,
    .action-button:hover {
        background-color: #3a3a3a;
    }
    
    .action-button.save {
        background-color: #c01515;
        border-color: #c01515;
    }
    
    .action-button.save:hover {
        background-color: #d42020;
    }
    
    .action-button.cancel {
        background-color: #444;
    }
    
    .action-button.cancel:hover {
        background-color: #555;
    }
    
    .slideshow-content {
        flex: 1;
        display: flex;
        background-color: #1e1e1e;
        border-radius: 8px;
        overflow: hidden;
    }
    
    .no-collection {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: #777;
    }
    
    .slideshow-view {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        flex-direction: column;
        background-color: #000;
    }
    
    .slide-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
    }
    
    .slide-container img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        align-self: center;
    }
    
    .slide-info {
        position: absolute;
        bottom: 4rem;
        left: 0;
        width: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 0.5rem 0;
        text-align: center;
    }
    
    .slide-info h3 {
        margin: 0;
        padding: 0 1rem;
    }
    
    .slideshow-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: space-between;
        padding: 0.75rem;
        background-color: rgba(0, 0, 0, 0.7);
    }
    
    .control-button {
        background-color: rgba(255, 255, 255, 0.15);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .control-button:hover {
        background-color: rgba(255, 255, 255, 0.25);
    }
    
    .control-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .control-button.play {
        background-color: rgba(192, 21, 21, 0.8);
    }
    
    .control-button.play:hover {
        background-color: rgba(192, 21, 21, 1);
    }
    
    .control-button.stop {
        background-color: rgba(192, 21, 21, 0.8);
    }
    
    .control-button.stop:hover {
        background-color: rgba(192, 21, 21, 1);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .control-button .text {
            display: none;
        }
        
        .control-button .arrow {
            font-size: 1.25rem;
        }
    }
    
    /* Fullscreen mode */
    :global(.slideshow-container:fullscreen) {
        background-color: #000;
        padding: 0;
    }
    
    :global(.slideshow-container:fullscreen) .slideshow-header {
        background-color: rgba(30, 30, 30, 0.8);
        border-radius: 0;
        margin-bottom: 0;
    }
    
    :global(.slideshow-container:fullscreen) .slideshow-content {
        background-color: transparent;
        border-radius: 0;
    }
    
    /* Transitions */
    .fade {
        animation: fade 1s ease;
    }
    
    .slide {
        animation: slide 1s ease;
    }
    
    .zoom {
        animation: zoom 1s ease;
    }
    
    .flip {
        animation: flip 1s ease;
    }
    
    @keyframes fade {
        0% { opacity: 1; }
        50% { opacity: 0; }
        100% { opacity: 1; }
    }
    
    @keyframes slide {
        0% { transform: translateX(0); }
        50% { transform: translateX(-100%); }
        50.1% { transform: translateX(100%); }
        100% { transform: translateX(0); }
    }
    
    @keyframes zoom {
        0% { transform: scale(1); }
        50% { transform: scale(0.5); opacity: 0; }
        50.1% { transform: scale(1.5); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes flip {
        0% { transform: rotateY(0); }
        50% { transform: rotateY(90deg); }
        100% { transform: rotateY(0); }
    }
    
    .start-button {
        padding: 0.5rem 1rem;
        background-color: #c01515;
        color: white;
        border: 1px solid #c01515;
        border-radius: 4px;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.2s;
    }
    
    .start-button:hover {
        background-color: #d42020;
    }
    
    .stop-button {
        padding: 0.5rem 1rem;
        background-color: #444;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.2s;
    }
    
    .stop-button:hover {
        background-color: #555;
    }
    
    .nav-area {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 20%;
        z-index: 10;
        cursor: pointer;
        background: transparent;
        transition: background-color 0.2s;
    }
    
    .nav-area:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    
    .nav-left {
        left: 0;
    }
    
    .nav-right {
        right: 0;
    }
    
    .exit-fullscreen-button {
        padding: 0.5rem 1rem;
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.2s;
    }
    
    .exit-fullscreen-button:hover {
        background-color: #3a3a3a;
    }
</style> 