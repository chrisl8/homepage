---
title: Fastmail
description: Fastmail Widget Configuration
---

Learn more about [Fastmail](https://www.fastmail.com/).

You can generate an API token in [Settings → Privacy & Security → Integrations](https://app.fastmail.com/settings/security/integrations).

You can learn more about the Fastmail API at [Fastmail API](https://www.fastmail.com/dev/).

Allowed fields: `["unread", "inbox_total"]`.

```yaml
widget:
  type: fastmail
  url: https://api.fastmail.com
  token: token
```
