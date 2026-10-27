from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_campania_creador_alter_campania_imagenes'),
    ]

    operations = [
        migrations.CreateModel(
            name='Actualizacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(max_length=150)),
                ('contenido', models.TextField()),
                ('fecha_publicacion', models.DateTimeField(auto_now_add=True)),
                ('campania', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='actualizaciones', to='api.campania')),
            ],
            options={
                'ordering': ['-fecha_publicacion', '-id'],
            },
        ),
        migrations.CreateModel(
            name='Checkpoint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(max_length=120)),
                ('descripcion', models.TextField()),
                ('monto_objetivo', models.DecimalField(decimal_places=2, max_digits=10)),
                ('campania', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='checkpoints', to='api.campania')),
            ],
            options={
                'ordering': ['monto_objetivo', 'id'],
            },
        ),
    ]
