<!-- src/lib/components/file/FileList.svelte -->
<script>
  import { files, FileStatus } from '$lib/stores/files.js';
  import { fade, slide } from 'svelte/transition';
  import FileCard from './FileCard.svelte';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();

  /**
   * Handles individual file removal
   * @param {CustomEvent} event - The removal event
   */
  function handleRemove(event) {
      const { id } = event.detail;
      if (!id) return;

      const result = files.removeFile(id);
      if (result.success) {
          dispatch('fileRemoved', { id, file: result.file });
          // Clear store if this was the last file
          if ($files.length === 0) {
              files.clearFiles();
          }
      } else {
          console.error('Error removing file:', result.message);
      }
  }

  /**
   * Handles file selection
   * @param {CustomEvent} event - The selection event
   */
  function handleSelect(event) {
      const { id, selected } = event.detail;
      if (!id) return;

      const result = files.updateFile(id, { selected });
      if (result.success) {
          dispatch('fileSelected', { id, selected, file: result.file });
      }
  }

  function toggleSelectAll() {
      const allSelected = $files.every(f => f.selected);
      $files.forEach(file => {
          files.updateFile(file.id, { selected: !allSelected });
      });
  }

  function deleteSelected() {
      const selectedIds = $files.filter(f => f.selected).map(f => f.id);
      selectedIds.forEach(id => files.removeFile(id));
      // Clear store if all files were selected
      if (selectedIds.length === $files.length) {
          files.clearFiles();
      }
  }

  // Reactive declarations
  $: hasFiles = $files && $files.length > 0;
  $: selectedCount = $files.filter(f => f.selected).length;
  $: allSelected = hasFiles && $files.every(f => f.selected);
</script>

{#if hasFiles}
  <div class="file-list-container" in:slide>
      <div class="file-list-actions">
          <button 
              class="action-button"
              on:click={toggleSelectAll}
          >
              {allSelected ? 'Uncheck All' : 'Check All'}
          </button>
          {#if selectedCount > 0}
              <button 
                  class="action-button delete-button"
                  on:click={deleteSelected}
              >
                  Delete Selected ({selectedCount})
              </button>
          {/if}
      </div>
      <div class="file-list">
          {#each $files as file (file.id)}
              <div 
                  class="file-item"
                  in:fade={{ duration: 200 }}
                  out:fade={{ duration: 150 }}
              >
                  <FileCard 
                      {file}
                      on:remove={handleRemove}
                      on:select={handleSelect}
                  />
              </div>
          {/each}
      </div>
  </div>
{:else}
  <div class="empty-state" in:fade>
      <p>No files added yet.</p>
  </div>
{/if}

<style>
  .file-list-container {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      width: 100%;
      background: transparent;
      border-radius: var(--rounded-lg);
      padding: var(--spacing-md);
      position: relative;
      box-shadow: var(--shadow-sm);
  }

  /* Gradient border */
  .file-list-container::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: var(--rounded-lg);
      padding: 2px;
      background: linear-gradient(135deg, var(--color-prime), var(--color-second));
      -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
  }

  .file-list-actions {
      display: flex;
      justify-content: space-between;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      position: relative;
      z-index: 1;
  }

  .action-button {
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--rounded-md);
      position: relative;
      background: transparent;
      color: var(--color-text);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      overflow: hidden;
  }

  .action-button::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: var(--rounded-md);
      padding: 2px;
      background: linear-gradient(135deg, var(--color-prime), var(--color-second));
      -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
  }

  .action-button:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
  }

  .delete-button {
      color: var(--color-error);
  }

  .delete-button::before {
      background: linear-gradient(135deg, var(--color-error), var(--color-error-light));
  }

  .delete-button:hover {
      background: rgba(var(--color-error-rgb), 0.1);
  }

  .file-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      max-height: 400px;
      overflow-y: auto;
      padding: var(--spacing-xs);
      background: transparent;
      border-radius: var(--rounded-md);
      scrollbar-width: thin;
      scrollbar-color: var(--color-border) transparent;
      position: relative;
      z-index: 1;
  }

  .file-list::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: var(--rounded-md);
      padding: 2px;
      background: linear-gradient(135deg, var(--color-prime), var(--color-second));
      -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
  }

  .file-list::-webkit-scrollbar {
      width: 8px;
  }

  .file-list::-webkit-scrollbar-track {
      background: transparent;
  }

  .file-list::-webkit-scrollbar-thumb {
      background-color: var(--color-border);
      border-radius: var(--rounded-full);
      border: 2px solid transparent;
  }

  .file-item {
      width: 100%;
      position: relative;
      z-index: 1;
  }

  .empty-state {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--color-text-secondary);
      background: transparent;
      border-radius: var(--rounded-lg);
      position: relative;
  }

  .empty-state::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: var(--rounded-lg);
      padding: 2px;
      background: linear-gradient(135deg, var(--color-prime), var(--color-second));
      -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
  }
</style>
