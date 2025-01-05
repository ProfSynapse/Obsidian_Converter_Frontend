<script>
  import Accordion from './common/Accordion.svelte';
</script>

<div class="instructions">
  <Accordion title="README - About This Tool & How to Use It" icon="📚" expandedIcon="📚">
    <div class="instruction-content">
      <section class="instruction-section">
        <h3>🎯 Purpose</h3>
        <p>
          This tool helps you convert your digital content into Markdown files optimized for 
          <a href="https://obsidian.md/" target="_blank" rel="noopener noreferrer">Obsidian</a>, 
          a powerful personal knowledge management system.
        </p>
        <p>
          By converting your content into Markdown, you're:
        </p>
        <ul>
          <li>Creating a portable, future-proof knowledge base</li>
          <li>Making your information more searchable and interconnected</li>
          <li>Preparing your data for local AI tools and Large Language Models</li>
          <li>Building a personal knowledge graph that you fully control</li>
        </ul>
        <div class="resources">
          <p><strong>New to Obsidian?</strong> Check out these resources:</p>
          <ul>
            <li><a href="https://obsidian.md/" target="_blank" rel="noopener noreferrer">Download Obsidian</a> - Free personal knowledge base</li>
            <li><a href="https://www.youtube.com/watch?v=vdD2FB-bmiE&list=PLa9S_7NRneu-XYTNzCA8T_B3B37ZVrgxx" target="_blank" rel="noopener noreferrer">Watch Synaptic Labs' Obsidian Tutorial Series</a> - Learn how to use Obsidian effectively</li>
          </ul>
        </div>
      </section>

      <section class="instruction-section">
        <h3>🔍 Different Ways to Convert</h3>
        <ul>
          <li>
            <strong>Single Web Page</strong> - Just paste any website URL (like "<em>www.example.com/article</em>"). 
            This will convert just that one page into a note.
          </li>
          <li>
            <strong>Parent URL</strong> - If you want to convert multiple linked pages, use a parent URL. 
            For example, if you put in "<em>www.example.com/guide</em>", it will convert that page <strong>AND</strong> all the pages it links to.
          </li>
          <li>
            <strong>YouTube Videos</strong> - Copy and paste any YouTube video link 
            (it should look like "<em>youtube.com/watch?v=...</em>"). This will create notes from the video content.
          </li>
          <li>
            <strong>Files from Your Computer</strong> - Click the upload box or drag files into it. You can add:
            <ul class="sub-list">
              <li>Regular documents (like Word files or PDFs)</li>
              <li>Audio/Video files (these need an API key)</li>
            </ul>
          </li>
        </ul>
      </section>

      <section class="instruction-section">
        <h3>🔑 About API Keys</h3>
        <ul>
          <li>You <strong>only</strong> need an OpenAI API key for audio/video files</li>
          <li>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI's platform</a></li>
          <li>You'll need to set up billing with OpenAI, but transcription is very affordable (typically just cents per audio minute)</li>
          <li>The key is temporary and gets cleared when you refresh</li>
          <li>Don't worry if you don't have one - you can still convert regular documents!</li>
        </ul>
      </section>

      <section class="instruction-section">
        <h3>📝 Steps to Convert</h3>
        <ol>
          <li>Add your content (either paste a URL or upload files)</li>
          <li>If you're converting audio/video, add your API key when prompted</li>
          <li>Click the "<strong>Start Conversion</strong>" button</li>
          <li>Wait for processing (this might take a minute)</li>
          <li>Download your converted notes in an organized .zip file.</li>
        </ol>
      </section>
    </div>
  </Accordion>
</div>

<style>
  .instructions {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    margin-top: calc(-1 * var(--spacing-md));
    color: var(--color-text-base, #333333);
  }

  .instruction-content {
    padding: var(--spacing-lg) var(--spacing-xl);
    line-height: 1.7;
    font-size: var(--font-size-base);
    /* Ensure base text is always visible */
    color: var(--color-text-base, #333333);
  }

  .instruction-section {
    margin-bottom: var(--spacing-xl);
  }

  .instruction-section:last-child {
    margin-bottom: 0;
  }

  h3 {
    font-size: var(--font-size-lg);
    font-weight: 700;
    /* Use more specific emphasis color with fallback */
    color: var(--color-text-emphasis, var(--color-text-base, #333333));
    margin-bottom: var(--spacing-md);
  }

  ul, ol {
    margin: 0;
    padding-left: var(--spacing-xl);
  }

  .sub-list {
    margin-top: var(--spacing-xs);
    padding-left: var(--spacing-lg);
  }

  li {
    margin-bottom: var(--spacing-sm);
  }

  li:last-child {
    margin-bottom: 0;
  }

  strong {
    /* Match heading color scheme */
    color: var(--color-text-emphasis, var(--color-text-base, #333333));
    font-weight: 600;
  }

  em {
    /* Ensure secondary text is visible in dark mode */
    color: var(--color-text-secondary, var(--color-text-base, #666666));
    background: var(--color-surface-highlight, rgba(127, 127, 127, 0.1));
    padding: 0.2em 0.4em;
    border-radius: var(--rounded-sm);
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  a {
    color: var(--color-primary, #007bff);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  p {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-base, #333333);
  }

  .resources {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--color-surface-highlight, rgba(127, 127, 127, 0.1));
    border-radius: var(--rounded-md);
  }

  .resources p {
    margin-bottom: var(--spacing-sm);
  }

  .resources ul {
    margin-bottom: 0;
  }

  /* Mobile Adjustments */
  @media (max-width: 640px) {
    .instruction-content {
      padding: var(--spacing-md);
      font-size: var(--font-size-sm);
    }

    h3 {
      font-size: var(--font-size-base);
    }

    ul, ol {
      padding-left: var(--spacing-lg);
    }

    .sub-list {
      padding-left: var(--spacing-md);
    }
  }
</style>
