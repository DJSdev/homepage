import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next";

import useWidgetAPI from "utils/proxy/use-widget-api";

export default function Component({ service }) {
  const { t } = useTranslation();

  const { widget } = service;

  const { data: poeData, error: poeError } = useWidgetAPI(widget, "poe", {
    refreshInterval: 5000,
  });

  const { data: sensorData, error: sensorError } = useWidgetAPI(widget, "sensor", {
    refreshInterval: 5000,
  });

  const { data: portData, error: portError } = useWidgetAPI(widget, "activeports", {
    refreshInterval: 5000,
  });

  if (poeError || sensorError || portError) {
    const finalError = poeError ?? sensorError ?? portError;
    return <Container service={service} error={finalError} />;
  }

  if (!poeData || !sensorData || !portData) {
    return <>
      <Container service={service}>
        <Block label="qnapqss.wattage" />
        <Block label="qnapqss.poeports" />
        <Block label="qnapqss.ports" />
        <Block label="qnapqss.sensor" />
      </Container>
    </>
  }

  return <>
    <Container service={service}>
      <Block label="qnapqss.wattage" value={ `${poeData.wattsUsed.toFixed(0)} / ${poeData.maxPower}` } />
      <Block label="qnapqss.poeports" value={ `${poeData.numOfPoeDevices.toFixed(0)} / ${poeData.totalPoePorts}` } />
      <Block label="qnapqss.ports" value={ `${portData.activePorts} / ${poeData.totalPoePorts}` } />
      <Block label="qnapqss.sensor" value={t("common.number", { value: sensorData.switchTempC.toFixed(1), maximumFractionDigits: 1, style: "unit", unit: "celsius" })} />
    </Container>
  </>
}
