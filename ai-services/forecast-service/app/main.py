from __future__ import annotations

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel


app = FastAPI(title="fastapi-forecast-service")


class ForecastPoint(BaseModel):
    date: str
    value: float


class ForecastRequest(BaseModel):
    series: list[ForecastPoint]
    periods: int = 14
    freq: str = "D"


class ForecastResponse(BaseModel):
    forecast: list[dict]


def _enforce_auth(x_api_key: str | None) -> None:
    # Keep the hook compatible with the LLM service. Leave FORECAST_API_KEY empty
    # for internal Docker-only calls from job-service.
    import os

    api_key = os.getenv("FORECAST_API_KEY")
    if not api_key:
        return
    if not x_api_key or x_api_key != api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/market/forecast", response_model=ForecastResponse)
async def market_forecast(
    payload: ForecastRequest,
    x_api_key: str | None = Header(default=None),
) -> ForecastResponse:
    _enforce_auth(x_api_key)

    if len(payload.series) < 2:
        return ForecastResponse(forecast=[])

    try:
        import pandas as pd
        from prophet import Prophet
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prophet not available: {exc}") from exc

    df = pd.DataFrame([{"ds": item.date, "y": item.value} for item in payload.series])
    df["ds"] = pd.to_datetime(df["ds"])

    model = Prophet(daily_seasonality=True, weekly_seasonality=True)
    model.fit(df)
    future = model.make_future_dataframe(periods=payload.periods, freq=payload.freq)
    forecast = model.predict(future)

    tail = forecast.tail(payload.periods)[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    tail["ds"] = tail["ds"].dt.strftime("%Y-%m-%d")
    return ForecastResponse(forecast=tail.to_dict(orient="records"))
