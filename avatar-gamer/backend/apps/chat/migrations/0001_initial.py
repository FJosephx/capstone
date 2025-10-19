from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('accounts', '0005_profile_is_online'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('conversation_id', models.CharField(db_index=True, max_length=255)),
                ('sender_role', models.CharField(choices=[('admin', 'Admin'), ('operator', 'Operador'), ('user', 'Usuario')], max_length=16)),
                ('text', models.TextField()),
                ('client_message_id', models.CharField(blank=True, max_length=128, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recipient', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='incoming_chat_messages', to='auth.user')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='outgoing_chat_messages', to='auth.user')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['conversation_id', 'created_at'], name='apps_chat_c_convers_d111d3_idx'),
        ),
    ]
