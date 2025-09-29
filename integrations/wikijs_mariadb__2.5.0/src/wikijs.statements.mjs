// Statement are meant to be rerunnable
// INSERTS includes IGNORE
// UPDATES contain WHERE clauses to only fire when not run before

const statements = [

    // Remove permissions from group Guests
    "UPDATE `groups` SET `permissions` = '[]',`createdAt` = '{{now}}', `updatedAt` = '{{now}}' WHERE `name`= 'Guests' AND `permissions` <> '[]'",

    // Create new group Users
    "INSERT IGNORE INTO `groups` (`id`, `name`, `permissions`, `pageRules`, `isSystem`, `createdAt`, `updatedAt`, `redirectOnLogin`) VALUES" +
	`(3, 'Users', '["read:pages","read:assets","read:comments","write:comments","write:pages","manage:pages","delete:pages","read:history","read:source","write:assets","manage:assets"]', '[{"id":"default","deny":false,"match":"START","roles":["read:pages","read:assets","read:comments","write:comments"],"path":"","locales":[]}]', 0, '{{now}}', '{{now}}', '/')`,

    // Create keycload provider
    // "INSERT IGNORE INTO `authentication` (`key`, `isEnabled`, `config`, `selfRegistration`, `domainWhitelist`, `autoEnrollGroups`, `order`, `strategyKey`, `displayName`) VALUES" +
	// `('{{uuid}}', 1, '{"host":"{{iamUrl}}","realm":"{{realm}}","clientId":"{{clientid}}","clientSecret":"{{clientsecret}}",
    //     "authorizationURL":"{{iamUrl}}/realms/{{realm}}/protocol/openid-connect/auth",
    //     "tokenURL":"{{iamUrl}}/realms/{{realm}}/protocol/openid-connect/token",
    //     "userInfoURL":"{{iamUrl}}/realms/{{realm}}/protocol/openid-connect/userinfo",
    //     "logoutUpstream":false,"logoutURL":"","logoutUpstreamRedirectLegacy":false}', 1, '{"v":[]}', '{"v":[3]}', 1, 'keycloak', 'Keycloak')`,

    // Create initial page
    "INSERT IGNORE INTO `pages` (`id`, `path`, `hash`, `title`, `description`, `isPrivate`, `isPublished`, `privateNS`, `publishStartDate`, `publishEndDate`, `content`, `render`, `toc`, `contentType`, `createdAt`, `updatedAt`, `editorKey`, `localeCode`, `authorId`, `creatorId`, `extra`) VALUES" + 
	`(1, 'home', 'b29b5d2ce62e55412776ab98f05631e0aa96597b', 'Untitled Page', '', 0, 1, NULL, '', '', '# Header\nYour content here', '<h1 class="toc-header" id="header"><a href="#header" class="toc-anchor">¶</a> Header</h1>\n<p>Your content here</p>\n', '[{"title":"Header","anchor":"#header","children":[]}]', 'markdown', '{{now}}', '{{now}}', 'markdown', 'en', 1, 1, '{"js":"","css":""}');`,
    // Add page to page tree
    "INSERT IGNORE INTO `pageTree` (`id`, `path`, `depth`, `title`, `isPrivate`, `isFolder`, `privateNS`, `parent`, `pageId`, `localeCode`, `ancestors`) VALUES" +
	`(1, 'home', 1, 'Untitled Page', 0, 0, NULL, NULL, 1, 'en', '[]')`,

    // Deaktivate local auth
    // "UPDATE `authentication` SET `isEnabled` = 0 WHERE `key` = 'local' AND `isEnabled` <> 0",

    "UPDATE `users` SET `lastLoginAt` = '{{now}}' WHERE `id` = 1",

    // Configure instance to only use keycloak
    // "UPDATE settings SET `value` = JSON_SET(`value`, '$.autoLogin', true, '$.enforce2FA', NULL, '$.hideLocal', true, '$.loginBgUrl', NULL) `updatedAt` = '{{now}}' WHERE `key` = 'auth'",
    // "INSERT INTO settings (`key`, `value`, `updatedAt`) VALUES ('auth', '{\"autoLogin\":true,\"enforce2FA\":null,\"hideLocal\":true,\"loginBgUrl\":null,\"audience\":\"urn:wiki.js\",\"tokenExpiration\":\"30m\",\"tokenRenewal\":\"14d\"}', '{{now}}') ON DUPLICATE KEY UPDATE value = '{\"autoLogin\":true,\"enforce2FA\":null,\"hideLocal\":true,\"loginBgUrl\":null,\"audience\":\"urn:wiki.js\",\"tokenExpiration\":\"30m\",\"tokenRenewal\":\"14d\"}', updatedAt = '{{now}}'",

    // Add or update defulat settings
    "INSERT INTO settings (`key`, `value`, `updatedAt`) VALUES ('contentLicense', '{\"v\":\"\"}', '{{now}}') ON DUPLICATE KEY UPDATE value = '{\"v\":\"\"}', updatedAt = '{{now}}'",
    "INSERT INTO settings (`key`, `value`, `updatedAt`) VALUES ('editShortcuts', '{\"editFab\":true,\"editMenuBar\":false,\"editMenuBtn\":true,\"editMenuExternalBtn\":true,\"editMenuExternalName\":\"GitHub\",\"editMenuExternalIcon\":\"mdi-github\",\"editMenuExternalUrl\":\"https://github.com/org/repo/blob/main/{filename}\"}', '{{now}}') ON DUPLICATE KEY UPDATE value = '{\"editFab\":true,\"editMenuBar\":false,\"editMenuBtn\":true,\"editMenuExternalBtn\":true,\"editMenuExternalName\":\"GitHub\",\"editMenuExternalIcon\":\"mdi-github\",\"editMenuExternalUrl\":\"https://github.com/org/repo/blob/main/{filename}\"}', updatedAt = '{{now}}'",
    "INSERT INTO settings (`key`, `value`, `updatedAt`) VALUES ('footerOverride', '{\"v\":\"\"}', '{{now}}') ON DUPLICATE KEY UPDATE value = '{\"v\":\"\"}', updatedAt = '{{now}}'",
    "INSERT INTO settings (`key`, `value`, `updatedAt`) VALUES ('pageExtensions', '{\"v\":[\"md\",\"html\",\"txt\"]}', '{{now}}') ON DUPLICATE KEY UPDATE value = '{\"v\":[\"md\",\"html\",\"txt\"]}', updatedAt = '{{now}}'",
    "INSERT INTO settings (`key`, `value`, `updatedAt`) VALUES ('security', '{\"securityOpenRedirect\":true,\"securityIframe\":true,\"securityReferrerPolicy\":true,\"securityTrustProxy\":false,\"securitySRI\":true,\"securityHSTS\":false,\"securityHSTSDuration\":300,\"securityCSP\":false,\"securityCSPDirectives\":\"\"}', '{{now}}') ON DUPLICATE KEY UPDATE value = '{\"securityOpenRedirect\":true,\"securityIframe\":true,\"securityReferrerPolicy\":true,\"securityTrustProxy\":false,\"securitySRI\":true,\"securityHSTS\":false,\"securityHSTSDuration\":300,\"securityCSP\":false,\"securityCSPDirectives\":\"\"}', updatedAt = '{{now}}'",

    // Prevent loading logo from wikijs website
    "INSERT INTO settings (`key`, `value`, `updatedAt`) VALUES ('logoUrl', '{\"v\":\"\"}', '{{now}}') ON DUPLICATE KEY UPDATE value = '{\"v\":\"\"}', updatedAt = '{{now}}'",

];


export default statements;