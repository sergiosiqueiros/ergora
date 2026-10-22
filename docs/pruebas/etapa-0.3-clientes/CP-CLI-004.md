# CP-CLI-004 — Verificación de aislamiento de lectura entre despachos mediante RLS

**Proyecto:** Érgora — Plataforma SaaS para la gestión de despachos jurídicos  
**Módulo:** Gestión de clientes  
**Etapa:** 0.3 — Implementación inicial del módulo de clientes  
**Tipo de prueba:** Seguridad / Autorización / Aislamiento multi-tenant  
**Fecha de ejecución:** 22 de octubre de 2026  
**Estado:** APROBADA

---

## 1. Objetivo

Verificar que las políticas de seguridad a nivel de fila (*Row-Level Security*, RLS) implementadas en PostgreSQL impidan que un usuario autenticado consulte información de clientes pertenecientes a un despacho jurídico del cual no es miembro.

La prueba busca demostrar que el aislamiento multi-tenant se aplica directamente en la base de datos, independientemente de los controles o filtros implementados en la interfaz de usuario.

## 2. Requisitos relacionados

- **REQ-SEG-001:** El sistema debe restringir el acceso a los datos de cada despacho a sus usuarios autorizados.
- **REQ-SEG-002:** El sistema debe impedir que un usuario consulte clientes pertenecientes a un despacho del cual no es miembro.
- **REQ-AUTH-001:** El sistema debe identificar al usuario mediante una sesión autenticada.

*Nota: los identificadores REQ son referencias propuestas para la matriz de trazabilidad y deberán homologarse con el catálogo oficial de requisitos del proyecto.*

## 3. Entorno de pruebas

| Elemento | Configuración |
|---|---|
| Aplicación | Érgora |
| Frontend | React + TypeScript + Vite |
| Autenticación | Supabase Auth |
| Base de datos | PostgreSQL administrado mediante Supabase |
| Control de acceso | PostgreSQL Row-Level Security |
| Cliente de conexión | Supabase JavaScript SDK |
| Interfaz de pruebas | Chrome DevTools — Console |
| Ambiente | Desarrollo local |

## 4. Datos de prueba

Se utilizaron dos despachos jurídicos ficticios y dos usuarios autenticados.

| Elemento | Identificación |
|---|---|
| Despacho A | Despacho Jurídico Alfa |
| Despacho B | Despacho Jurídico Beta |
| Usuario A | ssiqueiros@gmail.com |
| Usuario B | ssiqueiros@uabc.edu.mx |
| Cliente de prueba | Juan perez |

**Identificadores utilizados:**

- Despacho Alfa: `5e2e29e5-db13-4101-9731-7470083fda09`
- Cliente Juan perez: `f0590cb6-b80a-48f6-9b0b-7b4261798538`

El cliente de prueba se encontraba asociado al Despacho Jurídico Alfa.

## 5. Precondiciones

1. La tabla `public.clientes` existe en PostgreSQL.
2. La tabla tiene habilitado Row-Level Security.
3. Las políticas de consulta permiten únicamente acceder a clientes de despachos en los que el usuario tiene una membresía autorizada.
4. Existen dos despachos ficticios con sus respectivas membresías.
5. El cliente Juan perez está asociado al Despacho Jurídico Alfa.
6. El usuario B pertenece al Despacho Jurídico Beta y no al Despacho Jurídico Alfa.

## 6. Procedimiento de ejecución

1. Se inició sesión con el usuario A.
2. Se consultó la tabla `clientes` desde la consola del navegador.
3. Se confirmó la existencia del cliente Juan perez y su asociación con el Despacho Jurídico Alfa.
4. Se cerró la sesión del usuario A.
5. Se inició sesión con el usuario B.
6. Desde Chrome DevTools se ejecutó una consulta dirigida específicamente al identificador del cliente perteneciente a Alfa.
7. Se registró la respuesta recibida desde Supabase/PostgreSQL.

### Consulta ejecutada

```javascript
(async () => {
  const { supabase } = await import('/src/lib/supabase.ts');

  const { data: sesion } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, despacho_id')
    .eq('id', 'f0590cb6-b80a-48f6-9b0b-7b4261798538');

  console.log('Usuario:', sesion.user?.email);
  console.log('Clientes encontrados:', data);
  console.log('Error:', error);
})();
```

## 7. Resultado esperado

La consulta debe ejecutarse utilizando la identidad del usuario B.

PostgreSQL debe aplicar las políticas RLS y excluir cualquier registro cuyo despacho no corresponda a una membresía autorizada del usuario autenticado.

El resultado esperado es:

```text
Usuario: ssiqueiros@uabc.edu.mx
Clientes encontrados: []
Error: null
```

No debe devolverse el nombre del cliente ni ningún otro campo de su registro.

## 8. Resultado obtenido

La consola del navegador devolvió:

```text
Usuario: ssiqueiros@uabc.edu.mx
Clientes encontrados: []
Error: null
```

Previamente, la consulta realizada como usuario A había confirmado la existencia del registro:

```text
Nombre: Juan perez
ID: f0590cb6-b80a-48f6-9b0b-7b4261798538
Despacho ID: 5e2e29e5-db13-4101-9731-7470083fda09
Error: null
```

El registro existía y era accesible desde el contexto autorizado, pero no fue devuelto cuando la consulta se realizó mediante la cuenta del despacho Beta.

## 9. Evaluación del resultado

**RESULTADO: APROBADA**

Se comprobó que:

- El usuario B se encontraba autenticado correctamente.
- La consulta solicitó explícitamente un cliente existente de otro despacho.
- PostgreSQL devolvió un arreglo vacío.
- No se produjo un error de ejecución.
- No se revelaron datos del cliente perteneciente a Alfa.

El resultado es consistente con la aplicación correcta de la política RLS de lectura sobre `public.clientes`.

La prueba demuestra que el aislamiento no depende exclusivamente de filtros utilizados en React, puesto que la consulta fue ejecutada directamente mediante Supabase JS indicando el UUID del registro ajeno.

## 10. Evidencias

**Evidencia E-CP-CLI-004-01:** Captura de la consola mostrando la existencia del cliente Juan perez durante la sesión autorizada del usuario A.

**Evidencia E-CP-CLI-004-02:** Captura de la consola mostrando la identidad del usuario B y el resultado `Clientes encontrados: []`.

**Evidencia E-CP-CLI-004-03:** Consulta utilizada para verificar la identidad del despacho propietario del cliente.

Ubicación propuesta:

`docs/pruebas/etapa-0.3-clientes/evidencias/`

Las capturas originales deberán incorporarse al expediente para completar el respaldo documental de la prueba.

## 11. Limitaciones

Esta prueba verifica el aislamiento de lectura para un cliente específico y dos usuarios de prueba.

No constituye por sí sola una auditoría integral de seguridad ni demuestra que todas las tablas del sistema estén protegidas.

Las operaciones de inserción no autorizada y el acceso sin autenticación se verifican independientemente mediante CP-CLI-005 y CP-CLI-006.

## 12. Conclusión

La prueba CP-CLI-004 fue aprobada.

El comportamiento observado demuestra que el usuario autenticado del Despacho Jurídico Beta no pudo recuperar un registro de cliente perteneciente al Despacho Jurídico Alfa, incluso utilizando directamente su identificador UUID.

El resultado proporciona evidencia funcional de la efectividad del aislamiento de lectura multi-tenant implementado mediante PostgreSQL Row-Level Security en el módulo inicial de clientes de Érgora.

**Responsable de ejecución:** Desarrollador del proyecto Érgora  
**Estado final:** APROBADA