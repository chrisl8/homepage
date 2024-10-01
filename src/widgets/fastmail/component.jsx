import { useTranslation } from "next-i18next";

import Container from "components/services/widget/container";
import Block from "components/services/widget/block";
import useWidgetAPI from "utils/proxy/use-widget-api";

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;
  const { data, error } = useWidgetAPI(widget, "info");

  if (error) {
    return <Container service={service} error={error} />;
  }

  if (!data) {
    return (
      <Container service={service}>
        <Block label="fastmail.unread" />
        <Block label="fastmail.inbox_total" />
      </Container>
    );
  }

  return (
    <Container service={service}>
      <Block label="fastmail.unread" value={t("common.number", { value: data.unread })} />
      <Block label="fastmail.inbox_total" value={t("common.number", { value: data.total })} />
    </Container>
  );
}
