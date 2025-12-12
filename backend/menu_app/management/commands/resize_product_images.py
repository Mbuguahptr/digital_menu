import os
import shutil
from django.core.management.base import BaseCommand
from PIL import Image
from menu_app.models import Product  # fix the app name

class Command(BaseCommand):
    help = 'Resize all product images to square (1:1) and backup originals'

    def handle(self, *args, **options):
        backup_dir = os.path.join('media', 'product_images_backup')
        os.makedirs(backup_dir, exist_ok=True)

        products = Product.objects.exclude(image='').all()
        total = products.count()
        processed = 0

        for product in products:
            img_field = product.image
            if not img_field:
                continue

            img_path = img_field.path
            filename = os.path.basename(img_path)

            # Backup original
            backup_path = os.path.join(backup_dir, filename)
            if not os.path.exists(backup_path):
                shutil.copy2(img_path, backup_path)

            # Open image
            with Image.open(img_path) as img:
                # Determine square size based on shortest side
                min_side = min(img.width, img.height)

                # Center crop to square
                left = (img.width - min_side) / 2
                top = (img.height - min_side) / 2
                right = (img.width + min_side) / 2
                bottom = (img.height + min_side) / 2

                img_cropped = img.crop((left, top, right, bottom))

                # Resize to 800x800
                img_final = img_cropped.resize((800, 800), Image.Resampling.LANCZOS)

                # Save optimized
                img_final.save(img_path, optimize=True, quality=85)

            processed += 1
            self.stdout.write(f"[{processed}/{total}] Processed: {filename}")

        self.stdout.write(self.style.SUCCESS(
            f"Done! Processed {processed} images. Backup stored in {backup_dir}"
        ))
