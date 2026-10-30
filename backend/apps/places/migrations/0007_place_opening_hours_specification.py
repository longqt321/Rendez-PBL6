from django.db import migrations, models


def backfill_opening_hours(apps, schema_editor):
    Place = apps.get_model("places", "Place")
    for place in Place.objects.all():
        text = (place.opening_hours_text or "").strip()
        if not text:
            continue
        spec = {"note": text, "is_24_7": False, "regular": {}}
        if "24/7" in text:
            spec["is_24_7"] = True
        elif "–" in text or "-" in text:
            cleaned = text.split("hàng ngày")[0].replace("–", "-")
            parts = cleaned.split("-")
            if len(parts) == 2:
                open_time = parts[0].strip()
                close_time = parts[1].strip()
                days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
                spec["regular"] = {day: [{"open": open_time, "close": close_time}] for day in days}
        place.opening_hours_specification = spec
        place.save(update_fields=["opening_hours_specification"])


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("places", "0006_enable_postgresql_extensions_and_gist"),
    ]

    operations = [
        migrations.AddField(
            model_name="place",
            name="opening_hours_specification",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(backfill_opening_hours, reverse_backfill),
    ]
