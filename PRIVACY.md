# Privacy and data flows

Muse · Catch is designed to be local-first. Its default browser-extension endpoint is `http://localhost:5200/api/ingest`, but users can configure another endpoint. A custom endpoint may send captured content to a remote service controlled by that endpoint's operator.

## What the extension can capture

The Chrome extension requests broad host access so it can support capture across web pages. In the current implementation, it may send the following information to the configured ingest endpoint:

- page title, URL, selected text, or extracted page content when a user invokes a capture action;
- X/Twitter post text, author, URL, and post ID after a user likes or bookmarks a post;
- a WeChat public-article title, author, URL, and up to 3,000 characters of article text after the page has been visible for roughly three seconds.

The extension is intended for content the user is authorized to collect and process. Do not use it to capture sensitive, private, copyrighted, or personal content without an appropriate legal basis and permission.

## Storage and sharing

The bundled local backend uses SQLite. When running locally, captures are stored on the local machine unless the user configures another service. Deployments, custom endpoints, model providers, Telegram integrations, and other optional services may have their own data practices; review and configure them before use.

## Your choices

- Keep the default local endpoint when you do not want browser data sent to a remote server.
- Review the configured endpoint before using browser capture.
- Disable or remove the extension if you do not want page-level capture behavior.
- Do not commit local databases, API keys, tokens, signing keys, or exported capture data to a repository.

## For deployers

If you host Muse · Catch for other people, provide a deployment-specific privacy notice, secure the ingest endpoint, set appropriate authentication and retention rules, and make the corresponding source available as required by the AGPL-3.0 license.
