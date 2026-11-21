import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
const core = readFileSync(new URL('../../public/assets/js/legacy/10-app-core.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8');

const element = (id, tab) => ({
  id, dataset: tab ? { tab } : {}, hidden: false, attributes: {},
  classList: {
    values: new Set(),
    toggle(name, active) { active ? this.values.add(name) : this.values.delete(name); },
  },
  setAttribute(name, value) { this.attributes[name] = value; },
});
function seoFixture() {
  const buttons = ['score', 'meta', 'tips'].map(tab => element('', tab));
  const panels = ['score', 'meta', 'tips'].map(tab => element('seoTab-' + tab));
  const footer = element('seoFooter');
  const generate = element('seoGenerateMetaBtn');
  const document = {
    querySelector(selector) { return buttons.find(button => selector.includes(`"${button.dataset.tab}"`)); },
    querySelectorAll(selector) { return selector === '.seo-tab-btn' ? buttons : panels; },
    getElementById(id) { return id === footer.id ? footer : id === generate.id ? generate : null; },
  };
  const code = core.slice(core.indexOf('function seoSwitchTab('), core.indexOf('function seoParseArticleDocument('));
  const context = { document };
  runInNewContext(code, context);
  return { ...context, buttons, panels, footer, generate };
}

describe('modal navigation and compact footer regressions', () => {
  it('resolves the active SEO button by tab, even when a caller passes the wrong old index', () => {
    const x = seoFixture();
    x.seoSwitchTab('meta', x.buttons[2]);
    expect(x.buttons.map(b => b.attributes['aria-selected'])).toEqual(['false', 'true', 'false']);
    expect(x.panels.map(p => p.classList.values.has('active'))).toEqual([false, true, false]);
    expect(x.footer.dataset.tab).toBe('meta');
    expect(x.generate.hidden).toBe(false);
  });
  it('hides the metadata generation action outside the metadata tab', () => {
    const x = seoFixture();
    for (const tab of ['score', 'tips']) {
      x.seoSwitchTab(tab);
      expect(x.footer.dataset.tab).toBe(tab);
      expect(x.generate.hidden).toBe(true);
    }
  });
  it('keeps output choices out of the pinned assistant footer', () => {
    const footerStart = html.indexOf('id="smartGenerateFooter"');
    const footer = html.slice(footerStart, html.indexOf('</div>', footerStart));
    expect(footer).not.toContain('id="smartInsertMode"');
    expect(footer).not.toContain('smart-fmt-toggle');
    expect(html).toContain('class="smart-output-options"');
  });
  it('replaces the redundant improve toolbar action with the article outline workflow', () => {
    expect(html).toContain('id="articleOutlineToolbarBtn"');
    expect(html).toContain("onclick=\"openSmartAssistant('outline')\"");
    expect(html).toContain('id="smartOutlinePanel"');
    expect(html).not.toContain('id="improveTextToolbarBtn"');
    expect(html).not.toContain("setSmartAssistantTab('improve'");
    expect(main).toContain("outline: 'smartOutlinePanel'");
    expect(main).not.toContain('smartImprovePanel');
  });
  it('provides editable ordered H2 sections and FAQ before accepting an outline', () => {
    expect(html).toContain('id="articleOutlineSections"');
    expect(html).toContain('id="articleOutlineFaqQuestions"');
    expect(html).toContain('id="addArticleOutlineSection"');
    expect(main).toContain("name === 'outline' ? 'اعتماد المخطط'");
    expect(css).toContain('.article-outline-card');
    expect(css).toContain('@media(max-width:520px){.article-outline-fields{grid-template-columns:1fr}');
  });
  it('appends a matching approved outline without replacing the writer custom request', () => {
    const generate = core.slice(core.indexOf('async function aiGenerateArticle()'), core.indexOf('function aiSelectTitle('));
    expect(generate).toContain('approvedOutlineTitle === effectiveTopic');
    expect(generate).toContain("(document.getElementById('aiCustomRequest')||{}).value || ''");
    expect(generate).toContain('outlineInstruction');
    expect(generate).toContain(".filter(Boolean).join('\\n\\n')");
  });
  it('feeds CSS to Vite for versioned production assets and keeps an export fallback', () => {
    expect(html).toContain('href="/src/styles/app.css"');
    expect(core).toContain('link[rel="stylesheet"][href$=".css"]');
  });
  it('targets disclosure shells, not input borders or generated article disclosures', () => {
    expect(css).toContain('.ai-bottom-sheet details.ai-form-section,');
    expect(css).toContain('.ai-bottom-sheet details.ai-gen-subcard,');
    expect(css).toContain('.ai-bottom-sheet .ai-gen-card:has(details.ai-gen-subcard)');
    expect(css).toContain('border: 1px solid var(--contentL) !important;');
    expect(css).toContain('border-radius: 10px !important;');
    expect(css).toContain('padding-inline: 9px !important;');
    expect(css).not.toMatch(/details\s+\*\s*\{\s*border:\s*0/);
  });
  it('keeps the SEO footer and navigation within the SEO modal div stack', () => {
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    const stack = [], parents = {};
    for (const match of markup.matchAll(/<\/?div\b[^>]*>/gi)) {
      const tag = match[0];
      if (tag.startsWith('</')) { stack.pop(); continue; }
      const id = tag.match(/\bid="([^"]+)"/)?.[1] || '';
      if (id) parents[id] = [...stack];
      if (tag.includes('class="seo-tabs"')) parents.seoNavigation = [...stack];
      stack.push(id);
    }
    expect(parents.seoFooter).toContain('seoAssistantSheet');
    expect(parents.seoNavigation).toContain('seoAssistantSheet');
    expect(parents['seoTab-score']).toContain('seoAssistantSheet');
  });
});
