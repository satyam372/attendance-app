from pydantic import BaseModel, Field


class Location(BaseModel):
    longitude: float = Field(ge = -180, le = 180 )
    latitude : float = Field(ge = -90, le = 90)
    accuracy: float  = Field(ge = 0)