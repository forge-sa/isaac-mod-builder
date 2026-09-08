// Пресет .anm2 для "предмет лежит на полу" — см. docs/SPEC.md §6, §11.
//
// ВАЖНО (риск, см. docs/SPEC.md §11): структура и имена атрибутов ниже —
// приближение по документации/памяти сообщества модов, а не проверенный
// вживую файл. Перед использованием в реальном моде стоит открыть .anm2
// готового ванильного или модового предмета (например через
// ResourceExtractor/Basement Renovator) и свериться построчно — формат
// местами отличается между Afterbirth+ и Repentance.
//
// Пресет намеренно даёт только один статичный кадр Idle-анимации: этого
// достаточно, чтобы предмет корректно отображался на полу и в инвентаре.
// Кастомная покадровая анимация — второй этап (см. docs/SPEC.md §10).

export function buildDefaultCollectibleAnm2({ spriteSheetPath, width = 32, height = 32 }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AnimatedActor>
  <Info CreatedBy="Isaac Mod Builder" Version="1.0" />
  <Content>
    <Spritesheets>
      <Spritesheet Path="${spriteSheetPath}" Id="0" />
    </Spritesheets>
    <Layers>
      <Layer Name="body" Id="0" SpritesheetId="0" />
    </Layers>
    <Nulls>
      <Null Name="Hitbox" Id="0" />
    </Nulls>
    <Events></Events>
  </Content>
  <Animations DefaultAnimation="Idle">
    <Animation Name="Idle" Loop="true" NumFrames="1">
      <LayerAnimations>
        <LayerAnimation LayerId="0" Visible="true">
          <Frame XPosition="0" YPosition="0" Width="${width}" Height="${height}" Rotation="0"
                 Redtint="255" Greentint="255" Bluetint="255" Alphatint="255"
                 Redoffset="0" Greenoffset="0" Blueoffset="0" Delay="1" VisibleFlag="true" />
        </LayerAnimation>
      </LayerAnimations>
      <NullAnimations>
        <NullAnimation NullId="0" Visible="false">
          <Frame XPosition="0" YPosition="0" Delay="1" VisibleFlag="false" />
        </NullAnimation>
      </NullAnimations>
      <Triggers></Triggers>
    </Animation>
  </Animations>
</AnimatedActor>
`
}
