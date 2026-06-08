# Runbook del Operador — Cornerstone Live Two-Chain (Escenario-1)

**Estado del despliegue:** El estratega de dos piernas (`MacroHedgeStrategist`) está desplegado y en vivo en Somnia testnet. El oráculo de macro está entregado. La **EJECUCIÓN EN VIVO está actualmente ⊘ DIFERIDA** únicamente por una interrupción externa en las callbacks de validación de Somnia (los callbacks de inferencia no llegan silenciosamente — infra externa, sin ETA). Una vez que Somnia se recupere, este runbook funciona **sin ningún cambio de código**.

El artefacto garantizado durante el diferimiento es el modo `replay` (recibos reales capturados del T0 live-run, strike 360360). La UI baja honestamente a replay cuando el Agent-1 no está disponible.

---

## Precondiciones resueltas

| Precondición | Estado |
|---|---|
| `MacroHedgeStrategist` desplegado en Somnia 50312 | Resuelto — `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D` |
| Datum del oráculo entregado (co/inflation-rate, scaledValue=568) | Resuelto — `deliveredAt != 0` en testnet |
| `MacroHedgeExecutor` desplegado en fork de BuildBear (chainId 31337) | Resuelto — ver `lib/apps/abrigo/cornerstone/buildbear-deployments.json` |
| Live mint T0 verificado (tx `0xfce415a6…`, strike 360360, TokenId registrado) | Resuelto — snapshot en `replay` mode |
| Callbacks de validación de Somnia (inferencia LLM) | **⊘ DIFERIDO** — interrupción externa, sin ETA |

---

## ADVERTENCIA: Gasto de STT / seguridad 503

**LEER ANTES DE CONFIGURAR:**

- `/api/abrigo/agent1` **gasta automáticamente STT del operador por cada llamada** — cada ejecución de dos piernas deposita aprox. 0.9–1.0 STT en inferencia (0.5 STT por pierna school + 0.5 STT por pierna notional).
- La ruta tiene un **límite de tasa mínima de 30 segundos** entre llamadas para proteger el saldo del operador de un vaciado accidental por llamadas rápidas repetidas.
- Las llamadas son **secuenciales** — el nonce del operador es compartido; no lanzar llamadas paralelas.
- **La ruta DEBE devolver 503 en cualquier despliegue que no sea el del operador.** Nunca configure `SOMNIA_OPERATOR_PK` ni `AGENT1_ROUTE_SECRET` en despliegues de staging, preview o producción compartidos. Si alguno de los dos está ausente, la ruta devuelve 503 y no expone el endpoint de la clave del operador.
- Nunca cometa ni exponga `SOMNIA_OPERATOR_PK`. Es una clave privada de cuenta Somnia testnet con fondos reales de STT.

---

## Paso 1: Provisión de BuildBear (propietario: backend)

El ejecutor de BuildBear necesita `numberOfLegs(executor) == 0` en el momento de la demo para que el guard de frescura de la UI pase. Ejecutar el día de la demo (dentro del TTL de 3 días del fork):

```bash
# En el repo abrigo-somnia (no en este repo):
cd /home/jmsbpp/apps/d2p/abrigo/abrigo-somnia/contracts/script

# Variante fresh-executor / --no-mint (propietario: backend):
#   - Aprovisiona una nueva instancia del fork de BuildBear
#   - Deposita colateral en nombre del ejecutor (AccountInsolvent guard)
#   - NO ejecuta un mint de demo (numberOfLegs permanece == 0)
bash provision-buildbear-demo.sh --no-mint

# El script genera buildbear-deployments.json con las nuevas direcciones + RPC URL del fork
```

**Propietario:** backend (quien tiene acceso al contrato `abrigo-somnia`). El propietario frontend espeja el artefacto resultante en el siguiente paso.

**Timing:** aprovisionar en la mañana del día de la demo. El fork BuildBear caduca a los 3 días; si caduca antes de la demo usar el flag `isExpired` del JSON para el bloqueo de la UI.

---

## Paso 2: Espejo de buildbear-deployments.json (propietario: frontend)

Después de que el backend genere el nuevo `buildbear-deployments.json`:

```bash
# Copiar el artefacto actualizado al repo frontend:
cp /path/from/backend/buildbear-deployments.json \
   /home/jmsbpp/apps/d2p/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json

# Verificar que isExpired: false y que las direcciones son las nuevas:
cat lib/apps/abrigo/cornerstone/buildbear-deployments.json

# Commit:
git add lib/apps/abrigo/cornerstone/buildbear-deployments.json
git commit -m "chore(09): mirror updated buildbear-deployments.json for live demo run"
```

**Propietario:** frontend (este repo).

---

## Paso 3: Variables de entorno

Crear o actualizar el archivo `.env.local` (nunca commiteado):

```bash
# Clave privada del operador en Somnia testnet
# Cuenta con >50 STT; gasta ~1 STT por ejecución de dos piernas
SOMNIA_OPERATOR_PK=0x<64-char-hex-private-key>

# Secreto compartido para el header x-agent1-secret de POST /api/abrigo/agent1
# Generar con: openssl rand -hex 32
AGENT1_ROUTE_SECRET=<your-secret>

# Inputs de Agent-1 — FIJADOS (fuente de verdad: lib/apps/abrigo/somnia/agent1-inputs.ts)
# No sobreescribir salvo que el equipo backend actualice el datum del oráculo.
# dataKey = keccak256("co/inflation-rate") = 0xb73053d3...
# consensus = 500 (int256, escalado 2 decimales → 5.00%)
# userIntent = "Hedge COP depreciation from a rate-hike surprise"
# (estos están cableados en AGENT1_INPUTS — no requieren vars de entorno separadas)

# BuildBear fork RPC y direcciones — extraídos de buildbear-deployments.json
# (el JSON es la fuente de verdad; las vars de entorno de abajo son sólo referencia)
# BUILDBEAR_RPC_URL=https://rpc.buildbear.io/<node-id>
# BUILDBEAR_EXECUTOR_ADDRESS=0x...
# BUILDBEAR_POOL_ADDRESS=0x...
```

Ver `.env.example` para la documentación completa de placeholders.

Los AGENT1_INPUTS (dataKey / consensus / userIntent) están fijados en el código fuente en `lib/apps/abrigo/somnia/agent1-inputs.ts`. No requieren variables de entorno separadas; el route de Agent-1 los importa directamente.

---

## Paso 4: Arranque y verificación del estado del sistema

```bash
cd /home/jmsbpp/apps/d2p/frontend
pnpm dev
```

Abrir http://localhost:3000/apps/abrigo/cornerstone?mode=live

El sistema hará un sondeo de montaje:
1. Verificar si el fork de BuildBear es alcanzable (RPC probe)
2. Verificar `numberOfLegs(executor) == 0` (guard de frescura)
3. Si ambos pasan → modo live habilitado, botón "Confirm" activo
4. Si el fork no es alcanzable o caducó → la UI muestra "rpc-unreachable" con el motivo
5. Si `/api/abrigo/agent1` devuelve `ok:false` o 503 → la UI baja honestamente a `replay` (aria-live anuncia el cambio; sin hash de tx falso)

**Verificar que la UI está en modo live:** el banner debe mostrar "en vivo · fork de Polygon (BuildBear)" con el ícono Radio y borde izquierdo de acento.

---

## Paso 5: Ejecución del run en vivo (una vez que Somnia se recupere)

1. Conectar wallet al fork BuildBear (chainId 31337) en RainbowKit
2. Si la wallet está en otra cadena, el FreshnessGate mostrará "switch-chain" — hacer clic en "Cambiar a fork 31337"
3. Escribir o confirmar el intent de cobertura (prefijado con "Hedge COP depreciation from a rate-hike surprise")
4. Hacer clic en "Confirm" → el shell llama `useSwitchChain({ chainId: 31337 })` ANTES de `useWriteContract`
5. La UI muestra el estado de la pierna Agent-1 (Somnia): submitting → pending → confirmed
6. Una vez que Agent-1 completa (StrategistDecided): la UI muestra el tx de Somnia + la decisión
7. La UI muestra el estado de Agent-2 (BuildBear fork): submitting → pending → confirmed
8. Una vez minteado: la UI muestra el tx de BuildBear + tokenId + campos de honestidad

### Resultado esperado (en la recuperación de Somnia)

- **DOS links de explorador:**
  - Tx de Somnia (Agent-1): piernas school + notional en Somnia 50312 (`https://shannon-explorer.somnia.network/tx/0x…`)
  - Tx de BuildBear (Agent-2): mint del ejecutor en el fork 31337 (`https://explorer.buildbear.io/…`)
- **TokenId** renderizado en el panel de evidencia en cadena
- **`nonErgodicDisclosed`** pill visible en HedgeDecisionCardV2
- **Rationale `(TEMPLATE)`** en el panel del ejecutor — la geometría del strike es CONSTANTE (360360) para PKE; solo el notional varía con el prompt
- Todos los invariantes de honestidad §0 mantienen: sin "ejecutado/realizado/executed/realized", sin PnL `$`, sin hash `0x000…0`, pill de fork-verified neutral (nunca verde), pills con color+ícono+texto siempre

---

## Paso 6: Degradación honesta a replay (mientras Somnia está diferido)

Si Agent-1 no está disponible (503 — vars no configuradas, o timeout de callback de Somnia):

- La UI baja automáticamente a `replay` mode
- El banner muestra "modo repetición · recibos reales" (sin borde de acento)
- El transcript muestra la decisión del snapshot T0 (strike 360360, recibos reales)
- No se muestra ningún hash de tx en vivo falso
- `aria-live` anuncia el cambio de modo

Este es el **artefacto garantizado**. La demo puede proceder honestamente con replay.

---

## Paso 7: Post-demo (cuando Somnia se recupere)

Una vez que los callbacks de validación de Somnia estén de nuevo en línea:

1. Aprovisionar un nuevo fork de BuildBear (Paso 1) para restablecer `numberOfLegs == 0`
2. Espejo del nuevo `buildbear-deployments.json` (Paso 2)
3. Configurar env con `SOMNIA_OPERATOR_PK` y `AGENT1_ROUTE_SECRET` (Paso 3)
4. Ejecutar el run en vivo (Paso 5)
5. Después del run: ejecutar el agente Evidence Collector contra `/apps/abrigo/cornerstone?mode=live` para capturar los verdicts ✓ del run en vivo en `09-LIVE-VERIFICATION.md`

---

## Referencias

- Ruta Agent-1: `app/api/abrigo/agent1/route.ts`
- Inputs fijados: `lib/apps/abrigo/somnia/agent1-inputs.ts`
- Deployments del fork: `lib/apps/abrigo/cornerstone/buildbear-deployments.json`
- Shell cliente: `components/defi/cornerstone/CornerstoneClientShell.tsx`
- Spec v5: `docs/superpowers/specs/2026-06-07-module5-cornerstone-live-tx-design.md`
- Revisión de copia: `docs/copy-review.md`
- Abrigo-somnia README: `../abrigo/abrigo-somnia/README.md` — sección "Run it"
