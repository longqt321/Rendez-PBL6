from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("photos", "0008_add_placephoto_performance_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="photoasset",
            name="technical_metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
