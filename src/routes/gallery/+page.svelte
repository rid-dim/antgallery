<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { collections, images } from '$lib/stores';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import type { Image } from '$lib/types';
    
    // Collection state
    let selectedCollectionId: string | null = null;
    let collectionName = '';
    let collectionDescription = '';
    let showCreateCollection = false;
    let showDeleteConfirmation = false;
    
    // Image display state
    let displaySize: 'small' | 'medium' | 'large' | 'original' = 'medium';
    let selectedImage: Image | null = null;
    let showImageDetail = false;
    let isEditingImage = false;
    let editImageTitle = '';
    let editImageMetadata: Record<string, string | number | boolean | string[]> = {};
    let newEditMetadataKey = '';
    let newEditMetadataValue = '';
    
    // Add image form
    let showAddImage = false;
    let imageUrl = '';
    let imageTitle = '';
    let imageMetadata: Record<string, string> = {};
    let newMetadataKey = '';
    let newMetadataValue = '';
    
    // Initial setup
    onMount(() => {
        // If there are collections, select the first one by default
        if ($collections.length > 0) {
            selectedCollectionId = $collections[0].id;
        }
    });
    
    // Create a new collection
    function createCollection() {
        if (collectionName.trim()) {
            const id = collections.addCollection(collectionName, collectionDescription);
            selectedCollectionId = id;
            resetCollectionForm();
        }
    }
    
    // Reset collection form
    function resetCollectionForm() {
        collectionName = '';
        collectionDescription = '';
        showCreateCollection = false;
    }
    
    // Reset add image form
    function resetAddImageForm() {
        imageUrl = '';
        imageTitle = '';
        imageMetadata = {};
        newMetadataKey = '';
        newMetadataValue = '';
        showAddImage = false;
    }
    
    // Add a new image to the collection
    function addImage() {
        if (selectedCollectionId && imageUrl.trim() && imageTitle.trim()) {
            const imageId = images.addImage(imageUrl, imageTitle, imageMetadata);
            collections.addImageToCollection(selectedCollectionId, imageId);
            resetAddImageForm();
        }
    }
    
    // Add a metadata item to the new image
    function addMetadataItem() {
        if (newMetadataKey.trim() && newMetadataValue.trim()) {
            imageMetadata = {
                ...imageMetadata,
                [newMetadataKey]: newMetadataValue
            };
            newMetadataKey = '';
            newMetadataValue = '';
        }
    }
    
    // Remove a metadata item
    function removeMetadataItem(key: string) {
        const { [key]: _, ...rest } = imageMetadata;
        imageMetadata = rest;
    }
    
    // Delete selected collection
    function deleteCollection() {
        if (selectedCollectionId) {
            collections.removeCollection(selectedCollectionId);
            if ($collections.length > 0) {
                selectedCollectionId = $collections[0].id;
            } else {
                selectedCollectionId = null;
            }
            showDeleteConfirmation = false;
        }
    }
    
    // View image details
    function viewImageDetail(image: Image) {
        selectedImage = image;
        showImageDetail = true;
    }
    
    // Close image detail view
    function closeImageDetail() {
        showImageDetail = false;
        selectedImage = null;
        isEditingImage = false;
    }
    
    // Enter edit mode for selected image
    function enterEditMode() {
        if (selectedImage) {
            editImageTitle = selectedImage.title;
            editImageMetadata = { ...selectedImage.metadata };
            isEditingImage = true;
        }
    }
    
    // Exit edit mode
    function exitEditMode() {
        isEditingImage = false;
        editImageTitle = '';
        editImageMetadata = {};
        newEditMetadataKey = '';
        newEditMetadataValue = '';
    }
    
    // Save image edits
    function saveImageEdits() {
        if (selectedImage) {
            images.updateImage(selectedImage.id, {
                title: editImageTitle,
                metadata: editImageMetadata
            });
            
            // Update the selected image reference
            selectedImage = {
                ...selectedImage,
                title: editImageTitle,
                metadata: editImageMetadata
            };
            
            isEditingImage = false;
        }
    }
    
    // Remove image from collection
    function removeImageFromCollection() {
        if (selectedImage && selectedCollectionId) {
            collections.removeImageFromCollection(selectedCollectionId, selectedImage.id);
            closeImageDetail();
        }
    }
    
    // Add a metadata item to the image being edited
    function addEditMetadataItem() {
        if (newEditMetadataKey.trim() && newEditMetadataValue.trim()) {
            editImageMetadata = {
                ...editImageMetadata,
                [newEditMetadataKey]: newEditMetadataValue
            };
            newEditMetadataKey = '';
            newEditMetadataValue = '';
        }
    }
    
    // Remove a metadata item from the image being edited
    function removeEditMetadataItem(key: string) {
        const { [key]: _, ...rest } = editImageMetadata;
        editImageMetadata = rest;
    }
    
    // Helper to get collection's images
    $: collectionImages = selectedCollectionId
        ? $collections
            .find(c => c.id === selectedCollectionId)
            ?.imageIds
            .map(id => $images.find(img => img.id === id))
            .filter(Boolean) as Image[]
        : [];
    
    // Current collection
    $: currentCollection = $collections.find(c => c.id === selectedCollectionId);
    
    // Drag and drop functionality
    let draggedImageId: string | null = null;
    let hoveredImageId: string | null = null;
    
    // Track the original order for reverting if needed
    let originalOrderSnapshot: string[] = [];
    
    function handleDragStart(event: DragEvent, imageId: string) {
        draggedImageId = imageId;
        hoveredImageId = null;
        
        // Take a snapshot of the current order in case we need to revert
        if (selectedCollectionId) {
            const collection = $collections.find(c => c.id === selectedCollectionId);
            if (collection) {
                originalOrderSnapshot = [...collection.imageIds];
            }
        }
        
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            
            // Make the dragged item semi-transparent
            const draggedElement = event.currentTarget as HTMLElement;
            if (draggedElement) {
                draggedElement.classList.add('dragging');
            }
            
            // Set a transparent drag image
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            event.dataTransfer.setDragImage(img, 0, 0);
        }
    }
    
    function handleDragOver(event: DragEvent, imageId: string) {
        event.preventDefault();
        
        if (draggedImageId && draggedImageId !== imageId) {
            // Update the hovered image ID for live reordering
            if (hoveredImageId !== imageId) {
                hoveredImageId = imageId;
                
                // Perform a live reordering for visual feedback
                if (selectedCollectionId) {
                    const collection = $collections.find(c => c.id === selectedCollectionId);
                    
                    if (collection) {
                        const newOrder = [...collection.imageIds];
                        const draggedIndex = newOrder.indexOf(draggedImageId);
                        const targetIndex = newOrder.indexOf(imageId);
                        
                        if (draggedIndex !== -1 && targetIndex !== -1) {
                            newOrder.splice(draggedIndex, 1);
                            newOrder.splice(targetIndex, 0, draggedImageId);
                            
                            // Update the collection with the new image order (temporary)
                            collections.reorderImages(selectedCollectionId, newOrder);
                        }
                    }
                }
            }
            
            // Add visual cue for drop target
            const targetElement = document.querySelector(`[data-image-id="${imageId}"]`) as HTMLElement;
            if (targetElement) {
                targetElement.classList.add('drag-over');
            }
        }
    }
    
    function handleDragLeave(event: DragEvent, imageId: string) {
        const targetElement = document.querySelector(`[data-image-id="${imageId}"]`) as HTMLElement;
        if (targetElement) {
            targetElement.classList.remove('drag-over');
        }
    }
    
    function handleDragEnter(event: DragEvent) {
        event.preventDefault();
    }
    
    function handleDrop(event: DragEvent, targetImageId: string) {
        event.preventDefault();
        
        // Remove visual cues
        const elements = document.querySelectorAll('.drag-over');
        elements.forEach(el => el.classList.remove('drag-over'));
        
        // We've already updated the order on dragover, so just clean up here
        if (draggedImageId && selectedCollectionId) {
            const draggedElement = document.querySelector(`[data-image-id="${draggedImageId}"]`) as HTMLElement;
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
            }
        }
        
        hoveredImageId = null;
        draggedImageId = null;
    }
    
    function handleDragEnd(event: DragEvent) {
        // Remove visual cues from all elements
        const draggingElements = document.querySelectorAll('.dragging');
        draggingElements.forEach(el => el.classList.remove('dragging'));
        
        const hoverElements = document.querySelectorAll('.drag-over');
        hoverElements.forEach(el => el.classList.remove('drag-over'));
        
        // If the drop happened outside any valid target, revert to original order
        if (draggedImageId && !hoveredImageId && selectedCollectionId && originalOrderSnapshot.length > 0) {
            collections.reorderImages(selectedCollectionId, originalOrderSnapshot);
        }
        
        hoveredImageId = null;
        draggedImageId = null;
        originalOrderSnapshot = [];
    }
</script>

<div class="gallery-container">
    <header class="gallery-header">
        <div class="header-left">
            <h1>{$_('gallery.title')}</h1>
        </div>
        
        <div class="header-center">
            {#if selectedCollectionId}
                <div class="collection-selector">
                    <select bind:value={selectedCollectionId}>
                        {#each $collections as collection}
                            <option value={collection.id}>{collection.name}</option>
                        {/each}
                    </select>
                    
                    <button 
                        class="action-button" 
                        on:click={() => showCreateCollection = true}
                    >
                        {$_('gallery.createCollection')}
                    </button>
                    
                    {#if selectedCollectionId}
                        <button 
                            class="action-button" 
                            on:click={() => showAddImage = true}
                        >
                            {$_('gallery.addImage')}
                        </button>
                        
                        <button 
                            class="action-button warning" 
                            on:click={() => showDeleteConfirmation = true}
                        >
                            {$_('gallery.deleteCollection')}
                        </button>
                    {/if}
                </div>
            {:else}
                <div class="empty-collections">
                    <p>{$_('gallery.selectOrCreate')}</p>
                    <button 
                        class="action-button"
                        on:click={() => showCreateCollection = true}
                    >
                        {$_('gallery.createCollection')}
                    </button>
                </div>
            {/if}
        </div>
        
        <div class="header-right">
            <div class="display-options">
                <label>{$_('gallery.displaySize')}</label>
                <div class="size-buttons">
                    <button 
                        class:active={displaySize === 'small'} 
                        on:click={() => displaySize = 'small'}
                    >
                        {$_('gallery.smallSize')}
                    </button>
                    <button 
                        class:active={displaySize === 'medium'} 
                        on:click={() => displaySize = 'medium'}
                    >
                        {$_('gallery.mediumSize')}
                    </button>
                    <button 
                        class:active={displaySize === 'large'} 
                        on:click={() => displaySize = 'large'}
                    >
                        {$_('gallery.largeSize')}
                    </button>
                    <button 
                        class:active={displaySize === 'original'} 
                        on:click={() => displaySize = 'original'}
                    >
                        {$_('gallery.originalSize')}
                    </button>
                </div>
            </div>
        </div>
    </header>
    
    <main class="gallery-content">
        {#if showCreateCollection}
            <div class="collection-form">
                <h2>{$_('gallery.createCollection')}</h2>
                <form on:submit|preventDefault={createCollection}>
                    <div class="form-group">
                        <label for="collection-name">{$_('gallery.collectionName')}</label>
                        <input 
                            type="text" 
                            id="collection-name" 
                            bind:value={collectionName} 
                            placeholder={$_('gallery.collectionNamePlaceholder')}
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="collection-description">{$_('gallery.collectionDescription')}</label>
                        <textarea 
                            id="collection-description" 
                            bind:value={collectionDescription} 
                            placeholder={$_('gallery.collectionDescriptionPlaceholder')}
                            rows="3"
                        ></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="action-button save">
                            {$_('common.save')}
                        </button>
                        <button 
                            type="button" 
                            class="action-button cancel" 
                            on:click={resetCollectionForm}
                        >
                            {$_('common.cancel')}
                        </button>
                    </div>
                </form>
            </div>
        {:else if showAddImage}
            <div class="add-image-form">
                <h2>{$_('gallery.addImage')}</h2>
                <form on:submit|preventDefault={addImage}>
                    <div class="form-group">
                        <label for="image-url">{$_('gallery.imageUrl')}</label>
                        <input 
                            type="text" 
                            id="image-url" 
                            bind:value={imageUrl} 
                            placeholder="https://example.com/image.jpg"
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="image-title">{$_('gallery.imageTitle')}</label>
                        <input 
                            type="text" 
                            id="image-title" 
                            bind:value={imageTitle} 
                            placeholder="Bildbeschreibung"
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label>{$_('gallery.metadata')}</label>
                        
                        {#if Object.keys(imageMetadata).length > 0}
                            <div class="metadata-list">
                                {#each Object.entries(imageMetadata) as [key, value]}
                                    <div class="metadata-item">
                                        <strong>{key}:</strong> {value}
                                        <button 
                                            type="button" 
                                            class="remove-button" 
                                            on:click={() => removeMetadataItem(key)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p class="metadata-empty">{$_('gallery.noMetadata')}</p>
                        {/if}
                        
                        <div class="add-metadata">
                            <div class="metadata-inputs">
                                <input 
                                    type="text" 
                                    placeholder={$_('gallery.metadataKey')} 
                                    bind:value={newMetadataKey}
                                />
                                <input 
                                    type="text" 
                                    placeholder={$_('gallery.metadataValue')} 
                                    bind:value={newMetadataValue}
                                />
                            </div>
                            <button 
                                type="button" 
                                class="add-button" 
                                on:click={addMetadataItem}
                                disabled={!newMetadataKey.trim() || !newMetadataValue.trim()}
                            >
                                {$_('gallery.addMetadata')}
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="action-button save">
                            {$_('common.save')}
                        </button>
                        <button 
                            type="button" 
                            class="action-button cancel" 
                            on:click={resetAddImageForm}
                        >
                            {$_('common.cancel')}
                        </button>
                    </div>
                </form>
            </div>
        {:else if showDeleteConfirmation}
            <div class="delete-confirmation">
                <h2>{$_('gallery.deleteCollection')}</h2>
                <p>{$_('gallery.deleteConfirm')}</p>
                
                <div class="confirmation-actions">
                    <button 
                        class="action-button warning" 
                        on:click={deleteCollection}
                    >
                        {$_('common.yes')}
                    </button>
                    <button 
                        class="action-button cancel" 
                        on:click={() => showDeleteConfirmation = false}
                    >
                        {$_('common.no')}
                    </button>
                </div>
            </div>
        {:else if selectedCollectionId && collectionImages.length === 0}
            <div class="empty-gallery">
                <p>{$_('gallery.noImages')}</p>
                <button 
                    class="action-button"
                    on:click={() => goto('/profile')}
                >
                    {$_('gallery.uploadImages')}
                </button>
            </div>
        {:else if selectedCollectionId && collectionImages.length > 0}
            <div class="image-gallery" class:small={displaySize === 'small'} class:medium={displaySize === 'medium'} class:large={displaySize === 'large'} class:original={displaySize === 'original'}>
                {#each collectionImages as image}
                    <div 
                        class="gallery-item" 
                        class:small={displaySize === 'small'} 
                        class:medium={displaySize === 'medium'} 
                        class:large={displaySize === 'large'} 
                        class:original={displaySize === 'original'}
                        on:click={() => viewImageDetail(image)} 
                        on:keydown={(e) => e.key === 'Enter' && viewImageDetail(image)}
                        role="button"
                        tabindex="0"
                        draggable="true"
                        data-image-id={image.id}
                        on:dragstart={(e) => handleDragStart(e, image.id)}
                        on:dragover={(e) => handleDragOver(e, image.id)}
                        on:dragenter={handleDragEnter}
                        on:dragleave={(e) => handleDragLeave(e, image.id)}
                        on:drop={(e) => handleDrop(e, image.id)}
                        on:dragend={handleDragEnd}
                    >
                        <div class="image-wrapper">
                            <img src={image.url} alt={image.title} loading="lazy" />
                        </div>
                        <div class="image-title">{image.title}</div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="empty-gallery">
                <p>{$_('gallery.selectCollection')}</p>
            </div>
        {/if}
    </main>
</div>

{#if showImageDetail && selectedImage}
    <div class="image-detail-modal">
        <div 
            class="modal-overlay" 
            on:click={closeImageDetail} 
            on:keydown={(e) => e.key === 'Escape' && closeImageDetail()}
            role="button"
            tabindex="0"
            aria-label="Close image details"
        ></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>{selectedImage.title}</h2>
                <div class="modal-actions">
                    {#if !isEditingImage}
                        <button class="edit-button" on:click={enterEditMode}>
                            {$_('common.edit')}
                        </button>
                    {/if}
                    <button class="close-button" on:click={closeImageDetail}>×</button>
                </div>
            </div>
            
            <div class="modal-body">
                {#if isEditingImage}
                    <div class="edit-image-form">
                        <div class="form-group">
                            <label for="edit-image-title">{$_('gallery.imageTitle')}</label>
                            <input 
                                type="text" 
                                id="edit-image-title" 
                                bind:value={editImageTitle} 
                                required
                            />
                        </div>
                        
                        <div class="form-group">
                            <label>{$_('gallery.metadata')}</label>
                            
                            {#if Object.keys(editImageMetadata).length > 0}
                                <div class="metadata-list">
                                    {#each Object.entries(editImageMetadata) as [key, value]}
                                        <div class="metadata-item">
                                            <strong>{key}:</strong> {value}
                                            <button 
                                                type="button" 
                                                class="remove-button" 
                                                on:click={() => removeEditMetadataItem(key)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <p class="metadata-empty">{$_('gallery.noMetadata')}</p>
                            {/if}
                            
                            <div class="add-metadata">
                                <div class="metadata-inputs">
                                    <input 
                                        type="text" 
                                        placeholder={$_('gallery.metadataKey')} 
                                        bind:value={newEditMetadataKey}
                                    />
                                    <input 
                                        type="text" 
                                        placeholder={$_('gallery.metadataValue')} 
                                        bind:value={newEditMetadataValue}
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    class="add-button" 
                                    on:click={addEditMetadataItem}
                                    disabled={!newEditMetadataKey.trim() || !newEditMetadataValue.trim()}
                                >
                                    {$_('gallery.addMetadata')}
                                </button>
                            </div>
                        </div>
                        
                        <div class="edit-actions">
                            <button type="button" class="action-button save" on:click={saveImageEdits}>
                                {$_('common.save')}
                            </button>
                            <button type="button" class="action-button cancel" on:click={exitEditMode}>
                                {$_('common.cancel')}
                            </button>
                            <button type="button" class="action-button delete" on:click={removeImageFromCollection}>
                                {$_('common.remove')}
                            </button>
                        </div>
                    </div>
                {:else}
                    <div class="image-container">
                        <img src={selectedImage.url} alt={selectedImage.title} />
                    </div>
                    
                    <div class="image-metadata">
                        <h3>{$_('gallery.metadata')}</h3>
                        
                        {#if Object.keys(selectedImage.metadata).length > 0}
                            <table>
                                <tbody>
                                    {#each Object.entries(selectedImage.metadata) as [key, value]}
                                        <tr>
                                            <th>{key}</th>
                                            <td>{value}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        {:else}
                            <p>{$_('gallery.noMetadata')}</p>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .gallery-container {
        width: 100%;
        display: flex;
        flex-direction: column;
    }
    
    .gallery-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background-color: #1e1e1e;
        border-radius: 8px;
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
    }
    
    .collection-selector {
        display: flex;
        gap: 1rem;
        align-items: center;
    }
    
    .collection-selector select {
        padding: 0.5rem;
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        min-width: 200px;
    }
    
    .empty-collections {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }
    
    .empty-collections p {
        margin: 0;
        color: #aaa;
    }
    
    .header-right {
        display: flex;
        align-items: center;
    }
    
    .display-options {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
    }
    
    .display-options label {
        font-size: 0.9rem;
        color: #aaa;
    }
    
    .size-buttons {
        display: flex;
        gap: 0.25rem;
    }
    
    .size-buttons button {
        padding: 0.25rem 0.5rem;
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: background-color 0.2s;
    }
    
    .size-buttons button:hover {
        background-color: #3a3a3a;
    }
    
    .size-buttons button.active {
        background-color: #c01515;
        border-color: #c01515;
    }
    
    .gallery-content {
        flex: 1;
        background-color: #1e1e1e;
        border-radius: 8px;
        padding: 1.5rem;
    }
    
    .collection-form,
    .delete-confirmation,
    .add-image-form {
        max-width: 600px;
        margin: 0 auto;
        padding: 1.5rem;
        background-color: #2a2a2a;
        border-radius: 8px;
    }
    
    .collection-form h2,
    .delete-confirmation h2,
    .add-image-form h2 {
        margin-top: 0;
        color: #f5f5f5;
    }
    
    .delete-confirmation p {
        color: #f5f5f5;
        margin-bottom: 1.5rem;
    }
    
    .form-group {
        margin-bottom: 1.5rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        color: #f5f5f5;
    }
    
    .form-group input,
    .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        background-color: #333;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        font-family: inherit;
    }
    
    .form-actions,
    .confirmation-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    
    .action-button {
        padding: 0.5rem 1rem;
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
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
    
    .action-button.warning {
        background-color: #c01515;
        border-color: #c01515;
    }
    
    .action-button.warning:hover {
        background-color: #d42020;
    }
    
    .action-button.cancel {
        background-color: #444;
    }
    
    .action-button.cancel:hover {
        background-color: #555;
    }
    
    .empty-gallery {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        height: 100%;
        min-height: 300px;
        color: #777;
    }
    
    .image-gallery {
        display: grid;
        gap: 1rem;
        width: 100%;
    }
    
    .image-gallery.small {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
    
    .image-gallery.medium {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    
    .image-gallery.large {
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }
    
    .image-gallery.original {
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    }
    
    .gallery-item {
        cursor: pointer;
        overflow: hidden;
        border-radius: 8px;
        background-color: #2a2a2a;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s, box-shadow 0.2s, opacity 0.3s;
        position: relative;
        aspect-ratio: auto;
        will-change: transform;
    }
    
    .gallery-item.small .image-wrapper {
        height: 120px;
    }
    
    .gallery-item.medium .image-wrapper {
        height: 200px;
    }
    
    .gallery-item.large .image-wrapper {
        height: 300px;
    }
    
    .gallery-item.original .image-wrapper {
        height: auto;
    }
    
    .gallery-item:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    }
    
    .image-wrapper {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
    }
    
    .gallery-item img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background-color: #1e1e1e;
        display: block;
    }
    
    /* Drag and drop styling */
    .gallery-item.drag-over {
        border: 2px dashed #c01515;
        transform: scale(1.05);
    }
    
    .gallery-item.dragging {
        opacity: 0.6;
        z-index: 10;
        cursor: grabbing;
    }
    
    .gallery-item:active {
        cursor: grabbing;
    }
    
    .image-title {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 0.5rem;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    /* Image detail modal */
    .image-detail-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
    }
    
    .modal-content {
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        background-color: #1e1e1e;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
        position: relative;
        z-index: 1001;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background-color: #2a2a2a;
        border-bottom: 1px solid #333;
    }
    
    .modal-header h2 {
        margin: 0;
        color: #f5f5f5;
        font-size: 1.25rem;
    }
    
    .modal-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .edit-button {
        background-color: #2a2a2a;
        color: #f5f5f5;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 0.25rem 0.75rem;
        cursor: pointer;
        font-size: 0.9rem;
    }
    
    .edit-button:hover {
        background-color: #3a3a3a;
    }
    
    .close-button {
        background: none;
        border: none;
        color: #f5f5f5;
        font-size: 1.5rem;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
    }
    
    .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .image-container {
        text-align: center;
    }
    
    .image-container img {
        max-width: 100%;
        max-height: 60vh;
        object-fit: contain;
        border-radius: 4px;
    }
    
    .image-metadata {
        padding: 1rem;
        background-color: #2a2a2a;
        border-radius: 8px;
    }
    
    .image-metadata h3 {
        margin-top: 0;
        color: #f5f5f5;
        font-size: 1.1rem;
        margin-bottom: 1rem;
    }
    
    .image-metadata table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .image-metadata th,
    .image-metadata td {
        padding: 0.5rem;
        text-align: left;
        border-bottom: 1px solid #333;
    }
    
    .image-metadata th {
        width: 30%;
        color: #aaa;
    }
    
    .image-metadata td {
        color: #f5f5f5;
    }
    
    /* Metadata in the add image form */
    .metadata-list {
        margin-bottom: 1rem;
        background-color: #333;
        border-radius: 4px;
        padding: 0.5rem;
    }
    
    .metadata-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        border-bottom: 1px solid #444;
    }
    
    .metadata-item:last-child {
        border-bottom: none;
    }
    
    .metadata-empty {
        color: #777;
        font-style: italic;
        margin: 0.5rem 0;
    }
    
    .add-metadata {
        margin-top: 1rem;
    }
    
    .metadata-inputs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }
    
    .metadata-inputs input {
        flex: 1;
        padding: 0.5rem;
        background-color: #333;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
    }
    
    .add-button {
        padding: 0.5rem 1rem;
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
    }
    
    .add-button:hover:not(:disabled) {
        background-color: #3a3a3a;
    }
    
    .add-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .remove-button {
        background: none;
        border: none;
        color: #aaa;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0 0.5rem;
    }
    
    .remove-button:hover {
        color: #c01515;
    }
    
    /* Edit image form */
    .edit-image-form {
        padding: 1rem;
        background-color: #2a2a2a;
        border-radius: 8px;
    }
    
    .edit-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
    }
    
    .action-button.delete {
        background-color: #c01515;
        border-color: #c01515;
    }
    
    .action-button.delete:hover {
        background-color: #d42020;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .gallery-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }
        
        .header-center,
        .header-right {
            width: 100%;
        }
        
        .collection-selector {
            flex-direction: column;
            align-items: stretch;
        }
        
        .display-options {
            align-items: stretch;
        }
        
        .modal-content {
            width: 95%;
        }
    }
    
    /* Grid layout transitions */
    .image-gallery {
        transition: grid-template-rows 0.3s ease;
    }
    
    .image-gallery > * {
        transition: all 0.3s ease;
    }
    
    /* Animation for items being reordered */
    @keyframes reorderPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
    }
</style> 