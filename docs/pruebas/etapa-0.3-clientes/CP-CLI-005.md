# CP-CLI-005 — Verificación de bloqueo de inserciones no autorizadas mediante RLS

**Proyecto:** Érgora — Plataforma SaaS para la gestión de despachos jurídicos  
**Módulo:** Gestión de clientes  
**Etapa:** 0.3 — Implementación inicial del módulo de clientes  
**Tipo de prueba:** Seguridad / Autorización / Aislamiento multi-tenant / Escritura  
**Fecha de ejecución:** 22 de octubre de 2026  
**Estado:** APROBADA — Rechazo de inserción confirmado

---

## 1. Objetivo

Verificar que las políticas de seguridad a nivel de fila (*Row-Level Security*, RLS) implementadas en PostgreSQL impidan que un usuario autenticado registre clientes en un despacho jurídico al cual no pertenece.

La prueba busca demostrar que el control de autorización para operaciones de escritura se ejecuta directamente en la base de datos, independientemente de las restricciones establecidas en la interfaz de usuario.

## 2. Requisitos relacionados

- **REQ-SEG-001:** El sistema debe restringir el acceso a los datos de cada despacho a sus usuarios autorizados.
- **REQ-SEG-003:** El sistema debe impedir que un usuario registre clientes en un despacho del cual no es miembro.
- **REQ-AUTH-001:** El sistema debe identificar al usuario mediante una sesión autenticada.
- **REQ-CLI-001:** El sistema debe permitir registrar clientes asociados a un despacho autorizado.

*Nota: estos identificadores son referencias propuestas que deberán homologarse con el catálogo oficial de requisitos del proyecto.*

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

Se utilizaron dos despachos jurídicos y dos usuarios autenticados, creados exclusivamente para validar el funcionamiento multi-tenant.

| Elemento | Identificación |
|---|---|
| Despacho A | Despacho Jurídico Alfa |
| Despacho B | Despacho Jurídico Beta |
| Usuario A | ssiqueiros@gmail.com |
| Usuario B | ssiqueiros@uabc.edu.mx |
| Usuario ejecutor | Usuario B |
| Despacho objetivo | Despacho Jurídico Alfa |
| Nombre del cliente de prueba | PRUEBA RLS NO AUTORIZADA |

**UUID del despacho objetivo:**

`5e2e29e5-db13-4101-9731-7470083fda09`

El usuario B pertenece al Despacho Jurídico Beta y no dispone de membresía autorizada en el Despacho Jurídico Alfa.

## 5. Precondiciones

1. La tabla `public.clientes` existe en PostgreSQL.
2. La tabla tiene habilitado Row-Level Security.
3. Existe una política `INSERT` que verifica la membresía del usuario en el despacho mediante `WITH CHECK`.
4. Los dos despachos y sus respectivas membresías están registrados.
5. El usuario B puede iniciar sesión correctamente mediante Supabase Auth.
6. El usuario B no tiene autorización para insertar registros en el Despacho Jurídico Alfa.

## 6. Procedimiento de ejecución

1. Se inició sesión en Érgora utilizando la cuenta del usuario B.
2. Se abrió Chrome DevTools y se seleccionó la pestaña Console.
3. Se importó el cliente Supabase configurado en la aplicación.
4. Se verificó la identidad del usuario autenticado mediante `supabase.auth.getUser()`.
5. Se intentó insertar un cliente ficticio utilizando explícitamente el UUID del Despacho Jurídico Alfa.
6. Se registraron la respuesta HTTP, el código PostgreSQL, el mensaje de error y los datos devueltos.

### Código ejecutado

```javascript
(async () => {
  const { supabase } = await import('/src/lib/supabase.ts');

  // Confirmar identidad del usuario
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  console.log('Usuario:', auth.user?.email);

  if (authError || !auth.user) {
    console.error('No hay sesión válida', authError);
    return;
  }

  // Intentar crear un cliente en otro despacho
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      despacho_id: '5e2e29e5-db13-4101-9731-7470083fda09',
      nombre: 'PRUEBA RLS NO AUTORIZADA'
    })
    .select();

  console.log('Datos:', data);
  console.log('Código de error:', error?.code);
  console.log('Mensaje:', error?.message);
})();
```

## 7. Resultado esperado

PostgreSQL debe identificar que el usuario autenticado no pertenece al despacho especificado en el registro e impedir la operación `INSERT`.

Se espera una respuesta equivalente a:

```text
Usuario: ssiqueiros@uabc.edu.mx

HTTP: 403 Forbidden

Datos: null

Código de error: 42501

Mensaje:
new row violates row-level security policy for table "clientes"
```

La solicitud no debe crear ningún registro de cliente en el despacho objetivo.

## 8. Resultado obtenido

La ejecución produjo los siguientes resultados reales:

```text
Usuario: ssiqueiros@uabc.edu.mx

POST /rest/v1/clientes?select=*
403 (Forbidden)

Datos: null

Código de error: 42501

Mensaje:
new row violates row-level security policy for table "clientes"
```

La operación fue rechazada por PostgreSQL al evaluar la política RLS correspondiente a la tabla `clientes`.

El mensaje recibido indica que los valores propuestos para la nueva fila incumplen las condiciones de autorización establecidas en la política de inserción.

No se devolvió ningún registro creado.

**Verificación adicional pendiente de documentar:** consulta administrativa que confirme que no existe un registro con el nombre `PRUEBA RLS NO AUTORIZADA`.

## 9. Evaluación del resultado

**RESULTADO: APROBADA — Control RLS de inserción**

Se comprobó que:

- El usuario B estaba autenticado correctamente.
- Se intentó crear un cliente en un despacho ajeno.
- La solicitud fue enviada realmente a Supabase.
- El servidor respondió con HTTP `403 Forbidden`.
- PostgreSQL devolvió el código `42501`.
- El mensaje identificó explícitamente una violación de la política Row-Level Security.
- La operación no devolvió datos de inserción.

La respuesta obtenida demuestra que la política RLS de escritura impidió la operación no autorizada.

La prueba confirma que conocer el UUID de un despacho no proporciona autorización para registrar información dentro de él.

## 10. Verificación complementaria de integridad

Para reforzar la evidencia, se establece la siguiente comprobación administrativa:

```sql
SELECT
    COUNT(*) AS registros_no_autorizados
FROM public.clientes
WHERE nombre = 'PRUEBA RLS NO AUTORIZADA';
```

La consulta debe ejecutarse en SQL Editor mediante el rol administrativo `postgres`.

**Resultado esperado:**

```text
registros_no_autorizados
0
```

Al momento de elaborar este documento no se dispone del resultado de esa consulta complementaria. Una vez ejecutada, deberá incorporarse su captura como evidencia.

## 11. Evidencias

**Evidencia E-CP-CLI-005-01:** Captura de Chrome DevTools mostrando la sesión del usuario B.

**Evidencia E-CP-CLI-005-02:** Captura de la respuesta HTTP `403 Forbidden`, código PostgreSQL `42501` y mensaje de violación RLS.

**Evidencia E-CP-CLI-005-03:** Resultado de la consulta administrativa que comprueba la inexistencia del registro de prueba. Pendiente de incorporación.

**Ubicación:**

`docs/pruebas/etapa-0.3-clientes/evidencias/`

Las capturas deberán conservarse sin contraseñas, cookies, tokens de sesión ni claves privadas.

## 12. Limitaciones

La prueba demuestra el funcionamiento del control RLS de inserción para un usuario y un despacho ajeno específicos.

No sustituye las pruebas de modificación, eliminación, asignación de roles o acceso a otros recursos del sistema.

Estas operaciones deberán evaluarse cuando se incorporen las funcionalidades correspondientes.

La prueba tampoco representa una auditoría integral de seguridad ni una evaluación completa de vulnerabilidades.

## 13. Conclusión

La prueba CP-CLI-005 fue aprobada respecto de su objetivo principal: verificar el rechazo de una operación de inserción no autorizada.

La solicitud realizada por el usuario del Despacho Jurídico Beta para crear un cliente en el Despacho Jurídico Alfa fue rechazada mediante HTTP `403 Forbidden` y el código PostgreSQL `42501`, acompañado de un mensaje explícito de violación de Row-Level Security.

El resultado proporciona evidencia técnica de que **las políticas RLS de PostgreSQL impiden insertar registros de clientes en un despacho ajeno, aun cuando el usuario conoce su identificador UUID y realiza la operación directamente mediante el SDK de Supabase**.

**Responsable de ejecución:** Desarrollador del proyecto Érgora  
**Estado final:** APROBADA — Pendiente de incorporar evidencia complementaria de integridad