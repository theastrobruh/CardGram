# Música de CardGram

Coloca aquí las canciones y regístralas en `playlist.json`.

- `home/` — música de la pantalla de bienvenida.
- `my-cards/` — música de Mis cartas.

Ejemplo de `playlist.json`:

```json
{
  "home": ["home/welcome.mp3"],
  "my-cards": ["my-cards/cards.mp3"]
}
```

Formatos recomendados: MP3 u OGG. Las pistas se reproducen en bucle y hacen
crossfade suave al cambiar entre Inicio y Mis cartas. Si una lista está vacía,
no se reproduce nada para esa pantalla.