import cache from "memory-cache";

import { httpProxy } from "utils/proxy/http";
import { formatApiCall } from "utils/proxy/api-helpers";
import getServiceWidget from "utils/config/service-helpers";
import createLogger from "utils/logger";
import widgets from "widgets/widgets";

const proxyName = "fastmailProxyHandler";
const sessionTokenCacheKey = `${proxyName}__sessionToken`;
const logger = createLogger(proxyName);

async function getUserData(widget, service) {
  const api = widgets?.[widget.type]?.api;
  const url = new URL(formatApiCall(api, { ...widget }));
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${widget.token}` };

  const [status, , data] = await httpProxy(url, {
    method: "GET",
    headers,
  });

  if (status !== 200) {
    logger.error("Error getting user data from Fastmail: %s status %d. Data: %s", url, status, data);
    return;
  }

  const jsonData = JSON.parse(data.toString());
  cache.put(`${sessionTokenCacheKey}.${service}.accountId`, jsonData.primaryAccounts["urn:ietf:params:jmap:mail"]);
  cache.put(`${sessionTokenCacheKey}.${service}.apiUrl`, jsonData.apiUrl);
}

async function apiCall(widget, service) {
  const apiUrl = cache.get(`${sessionTokenCacheKey}.${service}.apiUrl`);
  const url = new URL(formatApiCall(apiUrl, { ...widget }));
  const accountId = cache.get(`${sessionTokenCacheKey}.${service}.accountId`);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${widget.token}` };

  const [status, , data] = await httpProxy(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
      methodCalls: [
        ["Mailbox/query", { accountId, filter: { role: "inbox", hasAnyRole: true } }, "inbox"],
        [
          "Mailbox/get",
          {
            accountId,
            "#ids": {
              resultOf: "inbox",
              name: "Mailbox/query",
              path: "/ids/*",
            },
          },
          "mailcount",
        ],
      ],
    }),
  });

  if (status !== 200) {
    logger.error("Error getting mailbox data from Fastmail: %s status %d. Data: %s", url, status, data);
    return null;
  }

  return JSON.parse(data.toString());
}

export default async function fastmailProxyHandler(req, res) {
  const { group, service } = req.query;

  if (!group || !service) {
    logger.debug("Invalid or missing service '%s' or group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  const widget = await getServiceWidget(group, service);
  if (!widget) {
    logger.debug("Invalid or missing widget for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  if (!cache.get(`${sessionTokenCacheKey}.${service}.accountId`)) {
    // Saves an API call by caching this data.
    await getUserData(widget, service);
  }

  if (!cache.get(`${sessionTokenCacheKey}.${service}.accountId`)) {
    return res.status(400).json({ error: "Error getting user data from Fastmail" });
  }

  const data = await apiCall(widget, service);

  if (!data) {
    return res.status(400).json({ error: "Error getting mailbox data from Fastmail" });
  }

  return res.status(200).send({
    total: data.methodResponses[1][1].list[0].totalEmails,
    unread: data.methodResponses[1][1].list[0].unreadEmails,
  });
}
