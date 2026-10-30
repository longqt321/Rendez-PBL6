from django.conf import settings
from django.db import models


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    place = models.ForeignKey("places.Place", on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "place"], name="unique_favorite")]
        indexes = [
            models.Index(fields=["user", "-created_at", "id"]),
        ]
