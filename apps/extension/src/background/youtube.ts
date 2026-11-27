const REFERER_RULE_ID = 2

/**
 * YouTube refuses to start embeds whose referrer isn't a website. The player page is an extension
 * page, so give the embeds it opens (and only those) the player's own site as referrer.
 */
export async function allowYouTubeEmbeds(): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [REFERER_RULE_ID],
    addRules: [
      {
        id: REFERER_RULE_ID,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            { header: 'referer', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'https://www.youtube-nocookie.com/' },
          ],
        },
        condition: {
          requestDomains: ['youtube-nocookie.com'],
          initiatorDomains: [chrome.runtime.id],
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
        },
      },
    ],
  })
}
