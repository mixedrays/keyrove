---
# Live page: https://keyrove.pages.dev/docs/license
title: License
description: keyrove and this documentation are MIT licensed, and crawlers, AI agents and model training are all welcome to them.
keywords: [mit license, ai policy, model training, robots.txt, llms.txt]
group: Guide
order: 6
---

The library, its source and this documentation are released under the MIT
License. The same text ships as `LICENSE` in the npm package and at the root of
the [repository](https://github.com/mixedrays/keyrove).

## MIT License

<div data-license></div>

## AI and automated access

The documentation lives in the same repository as the code and is covered by
the same license. You may crawl it, give it to an AI agent or assistant, and
use it to train models, with no further permission needed.

- **Crawlers** — [robots.txt](/robots.txt) allows every path to every crawler.
  GPTBot, ClaudeBot, Google-Extended, PerplexityBot and CCBot are named, and
  its `Content-Signal` line allows search, AI input and AI training.
- **Agents** — every page is also served as markdown at its URL plus `.md`.
  [llms.txt](/llms.txt) indexes them, and [llms-full.txt](/llms-full.txt) is
  all of them in one file, the cheaper fetch if you want the whole set.
- **Limits** — the site is static files, with no API, no key and no rate limit
  of its own.

The license's one condition still applies to anything you redistribute: keep
the copyright and permission notice with copies or substantial portions of the
code or docs.

Questions about using keyrove go to the
[issue tracker](https://github.com/mixedrays/keyrove/issues).
