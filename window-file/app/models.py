from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, model_validator

ShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
LongText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)
]
TopicTag = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)
]
KeyText = Annotated[str, StringConstraints(pattern=r"^[a-z0-9_\-]{1,64}$")]


class MembershipSizeRange(str, Enum):
    TINY = "tiny"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    VERY_LARGE = "very_large"


class LlmPolicyMode(str, Enum):
    ALLOW = "allow"
    DISALLOW = "disallow"
    UNDEFINED = "undefined"


class AdjacentRelationshipType(str, Enum):
    FRIENDLY_NEIGHBOR = "friendly_neighbor"
    HIGH_INTERACTION = "high_interaction"
    ALTERNATIVE_HOME = "alternative_home"
    OTHER = "other"


class InstanceInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: LongText
    url: HttpUrl


class PinnedContentItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
    ]
    url: HttpUrl
    notes: (
        Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None
    ) = None


class MemberFitSignals(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lookingFor: list[ShortText] = Field(default_factory=list, max_length=100)
    notLookingFor: list[ShortText] = Field(default_factory=list, max_length=100)


class LlmScrapingPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: LlmPolicyMode
    llmsTxtUrl: HttpUrl | None = None


class ModerationSatisfaction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: ShortText
    score: Annotated[float, Field(ge=0, le=1)]
    sampleSize: Annotated[int, Field(ge=0)] | None = None
    lastUpdated: datetime | None = None


class CustomField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: KeyText
    label: ShortText
    value: LongText


class AdjacentCommunity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
    ]
    url: HttpUrl
    relationshipTypes: list[AdjacentRelationshipType] = Field(
        default_factory=list, min_length=1, max_length=10
    )

    @model_validator(mode="before")
    @classmethod
    def migrate_single_relationship_type(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        if "relationshipTypes" in data or "relationshipType" not in data:
            return data
        migrated = dict(data)
        migrated["relationshipTypes"] = [data["relationshipType"]]
        migrated.pop("relationshipType", None)
        return migrated


class CommunityWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    specVersion: Annotated[str, StringConstraints(pattern=r"^0\.1\.0$")] = "0.1.0"
    generatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    instance: InstanceInfo | None = None

    description: LongText
    contentWarnings: list[ShortText] = Field(default_factory=list, max_length=50)
    topicTags: list[TopicTag] = Field(default_factory=list, max_length=100)
    pinnedContent: list[PinnedContentItem] = Field(default_factory=list, max_length=20)
    membershipSizeRange: MembershipSizeRange
    linkPolicy: LongText
    memberFitSignals: MemberFitSignals
    llmScrapingPolicy: LlmScrapingPolicy

    moderationSatisfaction: ModerationSatisfaction | None = None
    customFields: list[CustomField] = Field(default_factory=list, max_length=100)
    lurkerRatio: Annotated[float, Field(ge=0, le=1)] | None = None
    adjacentCommunities: list[AdjacentCommunity] = Field(
        default_factory=list, max_length=50
    )
