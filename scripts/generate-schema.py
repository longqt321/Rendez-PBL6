#!/usr/bin/env python3
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from drf_spectacular.generators import SchemaGenerator  # noqa: E402
from drf_spectacular.renderers import OpenApiYamlRenderer  # noqa: E402

generator = SchemaGenerator(title="Rendez API", version="1.0.0")
schema = generator.get_schema(request=None, public=True)
renderer = OpenApiYamlRenderer()
yaml_content = renderer.render(schema, renderer_context={}).decode("utf-8")

output_path = root / "backend" / "openapi.yaml"
output_path.write_text(yaml_content, encoding="utf-8")
print(
    f"Schema successfully written to {output_path} ({len(schema['paths'])} endpoints)"
)
