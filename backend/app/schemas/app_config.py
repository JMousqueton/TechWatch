from pydantic import BaseModel

class AppConfigSetRequest(BaseModel):
    key: str
    value: str

class AppConfigResponse(BaseModel):
    key: str
    value: str
