export function mapMetrics(currentConditions = {}) {
  const pressureMetric = currentConditions?.Pressure?.Metric;
  const windSpeedMetric = currentConditions?.Wind?.Speed?.Metric;
  const visibilityMetric = currentConditions?.Visibility?.Metric;
  const windDirection = currentConditions?.Wind?.Direction?.Localized;
  const airQualityEntry = Array.isArray(currentConditions?.AirAndPollen)
    ? currentConditions.AirAndPollen.find((item) =>
        String(item?.Name || '').toLowerCase() === 'airquality'
      )
    : null;

  const formatMetric = (metric) => {
    if (!metric) return null;
    const value = Number(metric.Value);
    const unit = metric.Unit || '';
    if (!Number.isFinite(value)) return null;
    return `${value.toFixed(1)} ${unit}`.trim();
  };

  const windDisplay = (() => {
    if (!windSpeedMetric) return null;
    const value = Number(windSpeedMetric.Value);
    if (!Number.isFinite(value)) return null;
    const unit = windSpeedMetric.Unit || '';
    return [
      `${value.toFixed(1)} ${unit}`.trim(),
      windDirection
    ]
      .filter(Boolean)
      .join(' ');
  })();

  return [
    {
      key: 'pressure',
      label: 'Pressure',
      display: formatMetric(pressureMetric) || '—'
    },
    {
      key: 'uvIndex',
      label: 'UV Index',
      display: [
        currentConditions?.UVIndex ?? '—',
        currentConditions?.UVIndexText
          ? `(${currentConditions.UVIndexText})`
          : null
      ]
        .filter(Boolean)
        .join(' ')
    },
    {
      key: 'wind',
      label: 'Wind',
      display: windDisplay || '—'
    },
    {
      key: 'visibility',
      label: 'Visibility',
      display: formatMetric(visibilityMetric) || '—'
    },
    {
      key: 'aqi',
      label: 'AQI',
      display:
        airQualityEntry?.Value != null
          ? String(airQualityEntry.Value)
          : '—'
    }
  ];
}

export function assemblePayload(currentConditions, forecastData, locationDetails) {
  const DEFAULT_LOCATION_NAME = 'Configured Skyline'; // You can hardcode this
  const dayForecast = forecastData?.DailyForecasts?.[0] || null;
  const locationName =
    locationDetails?.LocalizedName || DEFAULT_LOCATION_NAME;
  const regionParts = [];
  if (locationDetails?.AdministrativeArea?.LocalizedName) {
    regionParts.push(locationDetails.AdministrativeArea.LocalizedName);
  }
  if (locationDetails?.Country?.LocalizedName) {
    regionParts.push(locationDetails.Country.LocalizedName);
  }
  const forecastHeadline = forecastData?.Headline?.Text || '';

  return {
    city: locationName,
    region: regionParts.join(', '),
    timezone: locationDetails?.TimeZone?.Name || '',
    localTime:
      currentConditions?.LocalObservationDateTime ||
      dayForecast?.Date ||
      new Date().toISOString(),
    temperature: {
      current: currentConditions?.Temperature?.Metric?.Value ?? null,
      feelsLike:
        currentConditions?.RealFeelTemperature?.Metric?.Value ?? null
    },
    conditions: {
      description: currentConditions?.WeatherText || '—',
      narrative: forecastHeadline,
      isDayTime: currentConditions?.IsDayTime ?? null,
      hasPrecipitation: currentConditions?.HasPrecipitation ?? null,
      precipitationType: currentConditions?.PrecipitationType || '',
      icon: currentConditions?.WeatherIcon
    },
    forecast: {
      high: dayForecast?.Temperature?.Maximum?.Value ?? null,
      low: dayForecast?.Temperature?.Minimum?.Value ?? null,
      narrative:
        dayForecast?.Day?.LongPhrase ||
        dayForecast?.Night?.LongPhrase ||
        forecastHeadline
    },
    metrics: mapMetrics(currentConditions),
    fetchedAt: new Date().toISOString(),
    refreshIntervalMinutes: 15
  };
}