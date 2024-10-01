import fastmailProxyHandler from "./proxy";

const widget = {
  api: "{url}/.well-known/jmap",
  proxyHandler: fastmailProxyHandler,
  mappings: {
    info: {
      endpoint: "/",
    },
  },
};

export default widget;
