import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const core = readFileSync(new URL('../../public/assets/js/legacy/10-app-core.js', import.meta.url), 'utf8');
const integrations = readFileSync(new URL('../../public/assets/js/legacy/20-editor-and-integrations.js', import.meta.url), 'utf8');

function getPayloadBuilder(){
  const start = core.indexOf('function buildBloggerPostPayload(');
  const end = core.indexOf('\nasync function publishToBlogger', start);
  const context = {};
  runInNewContext(core.slice(start, end) + '\nglobalThis.buildPayload = buildBloggerPostPayload;', context);
  return input => JSON.parse(JSON.stringify(context.buildPayload(input)));
}

async function runLockedPublish(){
  const statuses = [];
  let settingsOpened = 0;
  const start = core.indexOf('async function publishToBlogger(retry){');
  const end = core.indexOf('\n}\n\n/* ============================================================\n   25.', start);
  const context = {
    window: {
      modweebCrypto: {isUnlocked: () => false},
      openBloggerSettingsFromPublish(){ settingsOpened++; },
    },
    modweebShowStatus(message, duration){ statuses.push({message, duration}); },
  };
  runInNewContext(core.slice(start, end + 2) + '\nglobalThis.publishForTest = publishToBlogger;', context);
  await context.publishForTest();
  return {statuses, settingsOpened};
}

function connectionFixture(initiallyUnlocked = false){
  let unlocked = initiallyUnlocked;
  const statuses = [];
  const requests = [];
  const password = {value: 'synthetic-master-password', focused: false, focus(){ this.focused = true; }};
  const nodes = {
    bloggerVaultForm: {hidden: false},
    bloggerVaultState: {textContent: ''},
    bloggerVaultConfirmWrap: {hidden: false},
    bloggerVaultUnlockBtn: {textContent: '', disabled: false},
    bloggerVaultLockBtn: {hidden: false},
    bloggerVaultPassword: password,
    bloggerVaultConfirm: {value: ''},
    bloggerVaultMessage: {textContent: ''},
  };
  const context = {
    window: {modweebCrypto: {
      isUnlocked: () => unlocked,
      hasPassword: () => true,
      async unlock(){ unlocked = true; },
    }},
    document: {getElementById: id => nodes[id] || null},
    captureCurrentField(){},
    async readAll(){ return {blogId: 'synthetic-blog-id', apiKey: 'synthetic-api-key'}; },
    async renderTabs(){},
    async renderProvider(){},
    refreshFields: undefined,
    setStatus(message, type){ statuses.push({message, type}); },
    async fetch(url){
      requests.push(url);
      return {ok: true, async json(){ return {name: 'Synthetic blog'}; }};
    },
  };
  const start = integrations.indexOf('  let pendingConnectionTest = false;');
  const end = integrations.indexOf('  async function onVaultChanged(){', start);
  const section = integrations.slice(start, end) +
    '\nglobalThis.connectionTest = test; globalThis.unlockVaultForTest = unlockVault; globalThis.testPending = () => pendingConnectionTest;';
  runInNewContext(section, context);
  return {context, statuses, requests, password};
}

describe('Blogger API publication', () => {
  it('uses Blogger resource kind and includes only supported post fields', () => {
    const build = getPayloadBuilder();
    const payload = build({
      blogId: ' 123456 ', postType: 'post', title: '  Example title  ',
      labels: ' تقنية, أخبار، مراجعات ', content: '<p>Article body</p>',
    });
    expect(payload).not.toHaveProperty('kind');
    expect(payload).not.toHaveProperty('blog');
    expect(payload.title).toBe('Example title');
    expect(payload.labels).toEqual(['تقنية', 'أخبار', 'مراجعات']);
    expect(payload.content).toBe('<!--more-->\n<p>Article body</p>');
    expect(payload).not.toHaveProperty('customMetaData');
    expect(payload).not.toHaveProperty('desiredSlug');
  });

  it('does not send post-only labels or read-more markers when creating a page', () => {
    const payload = getPayloadBuilder()({
      blogId: '123456', postType: 'page', title: 'Contact',
      labels: 'page-label', content: '<!--more-->\n<p>Contact details</p>',
    });
    expect(payload).not.toHaveProperty('kind');
    expect(payload.content).toBe('<p>Contact details</p>');
    expect(payload).not.toHaveProperty('labels');
  });

  it('opens Blogger settings instead of trying to publish with a locked vault', async () => {
    const result = await runLockedPublish();
    expect(result.settingsOpened).toBe(1);
    expect(result.statuses[0].message).toContain('الخزنة مقفلة');
  });

  it('asks to unlock a locked vault and automatically tests after successful unlock', async () => {
    const x = connectionFixture(false);
    await x.context.connectionTest();
    expect(x.requests).toHaveLength(0);
    expect(x.password.focused).toBe(true);
    expect(x.context.testPending()).toBe(true);
    expect(x.statuses.at(-1).message).toContain('الخزنة مقفلة');

    await x.context.unlockVaultForTest();
    expect(x.requests).toHaveLength(1);
    expect(x.requests[0]).toContain('/blogs/synthetic-blog-id?key=synthetic-api-key');
    expect(x.context.testPending()).toBe(false);
    expect(x.statuses.at(-1).message).toContain('الاتصال ناجح');
  });
});
