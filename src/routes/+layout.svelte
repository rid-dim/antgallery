<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import { initI18n } from '$lib/i18n';
    import { darkMode, userProfile } from '$lib/stores';
    
    let showMobileMenu = false;
    let showSettings = false;
    let editingProfile = false;
    
    // Profile state
    let name = '';
    let apiEndpoint = 'http://localhost:17017/v0/';
    let profileImage: string | null = null;
    let showEditProfileImage = false;
    
    // Initialize profile state from store
    onMount(() => {
        if (browser) {
            initI18n();
            
            // Load profile values from store
            name = $userProfile.name;
            apiEndpoint = $userProfile.apiEndpoint;
            profileImage = $userProfile.profileImage;
            
            // Ensure userProfile is saved to localStorage
            const savedProfile = localStorage.getItem('userProfile');
            if (!savedProfile) {
                localStorage.setItem('userProfile', JSON.stringify($userProfile));
            }
        }
    });
    
    // Update local state when store changes
    $: {
        if ($userProfile) {
            if (!editingProfile) {
                name = $userProfile.name;
                apiEndpoint = $userProfile.apiEndpoint;
                profileImage = $userProfile.profileImage;
            }
        }
    }
    
    $: isActive = (path: string) => {
        return $page.url.pathname === path;
    };
    
    function toggleDarkMode() {
        darkMode.toggle();
    }
    
    function toggleMobileMenu() {
        showMobileMenu = !showMobileMenu;
        // Close settings menu if it's open
        if (showSettings) {
            showSettings = false;
        }
    }
    
    function toggleSettings() {
        showSettings = !showSettings;
        // Close mobile menu if it's open
        if (showMobileMenu) {
            showMobileMenu = false;
        }
    }
    
    // Handle profile image upload
    function handleImageUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const result = e.target?.result as string;
            profileImage = result;
        };
        
        reader.readAsDataURL(file);
    }
    
    // Save profile with immediate localStorage update
    function saveProfile() {
        userProfile.updateName(name);
        userProfile.updateApiEndpoint(apiEndpoint);
        userProfile.updateProfileImage(profileImage);
        
        // Force update to localStorage
        localStorage.setItem('userProfile', JSON.stringify({
            name,
            apiEndpoint,
            profileImage
        }));
        
        editingProfile = false;
    }
    
    // Reset settings
    function resetProfile() {
        userProfile.reset();
        name = '';
        apiEndpoint = 'http://localhost:17017/v0/';
        profileImage = null;
        
        // Force update to localStorage
        localStorage.setItem('userProfile', JSON.stringify({
            name: '',
            apiEndpoint: 'http://localhost:17017/v0/',
            profileImage: null
        }));
    }
    
    // Cancel editing and revert changes
    function cancelEditing() {
        name = $userProfile.name;
        apiEndpoint = $userProfile.apiEndpoint;
        profileImage = $userProfile.profileImage;
        editingProfile = false;
    }
</script>

<div class="app-container" class:dark-mode={$darkMode}>
    <header>
        <div class="header-content">
            <div class="logo-container">
                <h1 class="logo">
                    AntGallery{#if $userProfile.name}: {$userProfile.name}{/if}
                </h1>
            </div>
            
            <nav class="desktop-nav">
                <ul>
                    <li>
                        <a href="/gallery" class:active={isActive('/gallery')}>
                            {$_('nav.gallery')}
                        </a>
                    </li>
                    <li>
                        <a href="/slideshow" class:active={isActive('/slideshow')}>
                            {$_('nav.slideshow')}
                        </a>
                    </li>
                </ul>
            </nav>
            
            <div class="header-actions">
                <div 
                    class="profile-image-container"
                    on:mouseenter={() => showEditProfileImage = true}
                    on:mouseleave={() => showEditProfileImage = false}
                    on:click={() => {
                        showSettings = true;
                        editingProfile = true;
                    }}
                >
                    {#if $userProfile.profileImage}
                        <img src={$userProfile.profileImage} alt="Profile" class="profile-image" />
                    {:else}
                        <div class="profile-image-placeholder">
                            <span>{$userProfile.name ? $userProfile.name[0].toUpperCase() : '?'}</span>
                        </div>
                    {/if}
                    {#if showEditProfileImage}
                        <div class="edit-overlay">
                            <span>{$_('common.edit')}</span>
                        </div>
                    {/if}
                </div>
                
                <button class="settings-button" on:click={toggleSettings}>
                    <span class="burger-icon"></span>
                </button>
                
                <button class="mobile-menu-button" on:click={toggleMobileMenu}>
                    <span class="burger-icon"></span>
                </button>
            </div>
        </div>
        
        {#if showSettings}
            <div class="settings-menu">
                <div class="settings-header">
                    <h2>{$_('settings.title')}</h2>
                    <button class="close-button" on:click={toggleSettings}>×</button>
                </div>
                
                <div class="settings-content">
                    <div class="settings-group profile-section">
                        <div class="profile-header">
                            <h3>{$_('profile.title')}</h3>
                            <button class="edit-button" on:click={() => editingProfile = !editingProfile}>
                                {editingProfile ? $_('common.cancel') : $_('common.edit')}
                            </button>
                        </div>
                        
                        {#if editingProfile}
                            <div class="profile-edit-form">
                                <div class="profile-image-edit">
                                    <div class="profile-image-container large">
                                        {#if profileImage}
                                            <img src={profileImage} alt="Profile" class="profile-image" />
                                        {:else}
                                            <div class="profile-image-placeholder">
                                                <span>{name ? name[0].toUpperCase() : '?'}</span>
                                            </div>
                                        {/if}
                                    </div>
                                    
                                    <label class="upload-button">
                                        {$_('profile.uploadImage')}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            on:change={handleImageUpload} 
                                            style="display: none;"
                                        />
                                    </label>
                                </div>
                                
                                <div class="form-group">
                                    <label for="name">{$_('profile.name')}</label>
                                    <input 
                                        type="text" 
                                        id="name" 
                                        bind:value={name} 
                                        placeholder={$_('profile.name')}
                                    />
                                </div>
                                
                                <div class="form-group">
                                    <label for="apiEndpoint">{$_('profile.apiEndpoint')}</label>
                                    <input 
                                        type="text" 
                                        id="apiEndpoint" 
                                        bind:value={apiEndpoint} 
                                        placeholder="http://localhost:17017/v0/"
                                    />
                                </div>
                                
                                <div class="form-actions">
                                    <button class="save-button" on:click={saveProfile}>
                                        {$_('common.save')}
                                    </button>
                                    <button class="cancel-button" on:click={cancelEditing}>
                                        {$_('common.cancel')}
                                    </button>
                                    <button class="reset-button" on:click={resetProfile}>
                                        {$_('profile.resetSettings')}
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <div class="profile-info">
                                <div class="profile-image-container medium">
                                    {#if $userProfile.profileImage}
                                        <img src={$userProfile.profileImage} alt="Profile" class="profile-image" />
                                    {:else}
                                        <div class="profile-image-placeholder">
                                            <span>{$userProfile.name ? $userProfile.name[0].toUpperCase() : '?'}</span>
                                        </div>
                                    {/if}
                                </div>
                                <div class="profile-details">
                                    <p><strong>{$_('profile.name')}:</strong> {$userProfile.name || '-'}</p>
                                    <p><strong>{$_('profile.apiEndpoint')}:</strong> {$userProfile.apiEndpoint}</p>
                                </div>
                            </div>
                        {/if}
                    </div>
                    
                    <div class="settings-group">
                        <h3>{$_('settings.appearance')}</h3>
                        
                        <div class="setting-item">
                            <label class="switch">
                                <input type="checkbox" checked={$darkMode} on:change={toggleDarkMode}>
                                <span class="slider"></span>
                            </label>
                            <span>{$_('settings.darkMode')}</span>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h3>{$_('settings.language')}</h3>
                        
                        <div class="setting-item">
                            <select on:change={(e) => {
                                const newLang = e.currentTarget.value;
                                localStorage.setItem('language', newLang);
                                window.location.reload();
                            }}>
                                <option value="en" selected={$_('settings.currentLang') === 'en'}>{$_('settings.english')}</option>
                                <option value="de" selected={$_('settings.currentLang') === 'de'}>{$_('settings.german')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
        
        {#if showMobileMenu}
            <nav class="mobile-nav">
                <ul>
                    <li>
                        <a 
                            href="/gallery" 
                            class:active={isActive('/gallery')} 
                            on:click={() => showMobileMenu = false}
                        >
                            {$_('nav.gallery')}
                        </a>
                    </li>
                    <li>
                        <a 
                            href="/slideshow" 
                            class:active={isActive('/slideshow')} 
                            on:click={() => showMobileMenu = false}
                        >
                            {$_('nav.slideshow')}
                        </a>
                    </li>
                </ul>
            </nav>
        {/if}
    </header>
    
    <main>
        <slot />
    </main>
    
    <footer>
        <div class="footer-content">
            <p>immutable since {new Date().getFullYear()}</p>
        </div>
    </footer>
</div>

<style>
    /* Global styles */
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        font-size: 16px;
        line-height: 1.5;
        background-color: #f5f5f5;
        color: #333;
    }
    
    :global(a) {
        color: #c01515;
        text-decoration: none;
    }
    
    :global(a:hover) {
        text-decoration: underline;
    }
    
    :global(button) {
        cursor: pointer;
    }
    
    :global(.dark-mode) {
        background-color: #1a1a1a;
        color: #f5f5f5;
    }
    
    :global(.dark-mode a) {
        color: #e94545;
    }
    
    /* Layout styles */
    .app-container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
    
    header {
        background-color: #1e1e1e;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        position: relative;
    }
    
    .header-content {
        max-width: 1400px;
        margin: 0 auto;
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .logo-container {
        display: flex;
        align-items: center;
    }
    
    .logo {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #f5f5f5;
    }
    
    nav ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
    }
    
    .desktop-nav ul {
        gap: 2rem;
    }
    
    nav a {
        font-weight: 500;
        padding: 0.5rem 0;
        color: #f5f5f5;
        text-decoration: none;
        position: relative;
    }
    
    nav a:hover {
        text-decoration: none;
        color: #e94545;
    }
    
    nav a.active {
        color: #e94545;
    }
    
    nav a.active::after {
        content: '';
        position: absolute;
        bottom: -3px;
        left: 0;
        width: 100%;
        height: 3px;
        background-color: #e94545;
        border-radius: 3px;
    }
    
    .header-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .mobile-menu-button {
        display: none;
        background: none;
        border: none;
        padding: 0.5rem;
    }
    
    .settings-button {
        background: none;
        border: none;
        padding: 0.5rem;
        color: #f5f5f5;
        position: relative;
    }
    
    .burger-icon {
        display: block;
        width: 24px;
        height: 20px;
        position: relative;
    }
    
    .burger-icon::before,
    .burger-icon::after,
    .burger-icon::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 3px;
        background-color: #f5f5f5;
        border-radius: 3px;
        transition: all 0.3s ease;
    }
    
    .burger-icon::before {
        top: 0;
    }
    
    .burger-icon::after {
        bottom: 0;
    }
    
    .burger-icon::after {
        top: 50%;
        transform: translateY(-50%);
    }
    
    .mobile-nav {
        display: none;
        background-color: #1e1e1e;
        padding: 1rem 2rem;
        border-top: 1px solid #333;
    }
    
    .mobile-nav ul {
        flex-direction: column;
        gap: 1rem;
    }
    
    .settings-menu {
        position: absolute;
        top: 100%;
        right: 0;
        width: 300px;
        background-color: #1e1e1e;
        border: 1px solid #333;
        border-top: none;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 100;
        border-radius: 0 0 8px 8px;
    }
    
    .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #333;
    }
    
    .settings-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: #f5f5f5;
    }
    
    .close-button {
        background: none;
        border: none;
        color: #f5f5f5;
        font-size: 1.5rem;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
    }
    
    .settings-content {
        padding: 1rem;
    }
    
    .settings-group {
        margin-bottom: 1.5rem;
    }
    
    .settings-group h3 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        color: #aaa;
    }
    
    .setting-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.75rem;
    }
    
    .setting-item span {
        color: #f5f5f5;
    }
    
    .setting-item select {
        padding: 0.5rem;
        background-color: #2a2a2a;
        color: #f5f5f5;
        border: 1px solid #444;
        border-radius: 4px;
        min-width: 150px;
    }
    
    /* Switch styling */
    .switch {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 24px;
    }
    
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #2a2a2a;
        border-radius: 24px;
        transition: 0.3s;
    }
    
    .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 4px;
        bottom: 4px;
        background-color: #f5f5f5;
        border-radius: 50%;
        transition: 0.3s;
    }
    
    input:checked + .slider {
        background-color: #c01515;
    }
    
    input:checked + .slider:before {
        transform: translateX(24px);
    }
    
    main {
        flex: 1;
        max-width: 1400px;
        width: 100%;
        margin: 0 auto;
        padding: 2rem;
    }
    
    footer {
        background-color: #1e1e1e;
        padding: 1.5rem 0;
        color: #f5f5f5;
    }
    
    .footer-content {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
        text-align: center;
    }
    
    /* Dark mode overrides */
    .dark-mode header {
        background-color: #1a1a1a;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .dark-mode .mobile-nav,
    .dark-mode .settings-menu {
        background-color: #1a1a1a;
        border-color: #333;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .header-content {
            padding: 1rem;
        }
        
        .desktop-nav {
            display: none;
        }
        
        .mobile-menu-button {
            display: block;
        }
        
        .mobile-nav {
            display: block;
        }
        
        main {
            padding: 1.5rem 1rem;
        }
        
        .settings-menu {
            width: 100%;
            right: 0;
        }
    }
    
    .profile-image-container {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        cursor: pointer;
        position: relative;
        margin-right: 1rem;
        background-color: #2a2a2a;
        border: 2px solid #444;
        transition: all 0.2s ease;
    }
    
    .profile-image-container:hover {
        border-color: #c01515;
    }
    
    .profile-image-container.medium {
        width: 64px;
        height: 64px;
        flex-shrink: 0; /* Prevent shrinking */
    }
    
    .profile-image-container.large {
        width: 128px;
        height: 128px;
        flex-shrink: 0; /* Prevent shrinking */
    }
    
    .profile-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .profile-image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #2a2a2a;
        color: #f5f5f5;
        font-weight: bold;
    }
    
    .profile-image-container .edit-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 0.8rem;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .profile-image-container:hover .edit-overlay {
        opacity: 1;
    }
    
    .profile-section {
        border-bottom: 1px solid #333;
        padding-bottom: 1.5rem;
        margin-bottom: 1.5rem;
    }
    
    .profile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .profile-header h3 {
        margin: 0;
    }
    
    .profile-edit-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .profile-image-edit {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .profile-info {
        display: flex;
        gap: 1rem;
        align-items: flex-start; /* Align items to the top */
        width: 100%;
    }
    
    .profile-details {
        flex: 1;
        overflow: hidden; /* Prevent text overflow */
    }
    
    .profile-details p {
        margin: 0.5rem 0;
        color: #f5f5f5;
        word-break: break-word; /* Break long API URLs */
    }
    
    .profile-details strong {
        color: #aaa;
        margin-right: 0.5rem;
    }
    
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .form-group label {
        color: #aaa;
        font-size: 0.9rem;
    }
    
    .form-group input {
        padding: 0.5rem;
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
    }
    
    .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
        flex-wrap: wrap; /* Allow buttons to wrap on small screens */
    }
    
    .save-button,
    .reset-button,
    .cancel-button,
    .edit-button {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.2s;
    }
    
    .save-button {
        background-color: #c01515;
        color: white;
    }
    
    .save-button:hover {
        background-color: #d42020;
    }
    
    .reset-button {
        background-color: #444;
        color: white;
    }
    
    .reset-button:hover {
        background-color: #555;
    }
    
    .cancel-button {
        background-color: #333;
        color: white;
    }
    
    .cancel-button:hover {
        background-color: #444;
    }
    
    .edit-button {
        background-color: #2a2a2a;
        color: white;
        border: 1px solid #444;
    }
    
    .edit-button:hover {
        background-color: #3a3a3a;
    }
    
    .upload-button {
        background-color: #2a2a2a;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        border: 1px solid #444;
        transition: background-color 0.2s;
    }
    
    .upload-button:hover {
        background-color: #3a3a3a;
    }
</style> 