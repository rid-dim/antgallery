<script lang="ts">
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    
    onMount(() => {
        if (browser) {
            goto('/gallery');
        }
    });
</script>

<div class="redirect-container">
    <p>Redirecting to gallery...</p>
</div>

<style>
    .redirect-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }
</style>
