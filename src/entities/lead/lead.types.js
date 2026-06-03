// Tipos del dominio Lead (typedefs JSDoc). Sin runtime: documentan los shapes
// que circulan entre store, api, features y widgets del cluster comercial.

/**
 * Opcion de catalogo (we_* ). Forma canonica devuelta por catalog.options().
 * @typedef {Object} CatalogOption
 * @property {number} id
 * @property {string} description
 * @property {string} [alias]
 * @property {string} [value]
 * @property {string} [label]
 */

/**
 * Programa comercial (we_programs / version de programa).
 * @typedef {Object} Program
 * @property {number} program_version_id
 * @property {string} name
 * @property {number} [type_program_id]
 * @property {number} [model_modality_id]
 * @property {number} [currency_id]
 */

/**
 * Edicion de un programa (fechas de inicio, sesiones, precios).
 * @typedef {Object} Edition
 * @property {number} edition_id
 * @property {number} program_version_id
 * @property {string} start_date
 * @property {string} [end_date]
 * @property {number} [price]
 * @property {number} [sessions]
 */

/**
 * Descuento aplicado a una inscripcion (porcentaje + fijo + beneficio).
 * @typedef {Object} Discount
 * @property {number} [discount_id]
 * @property {number} dsct_porcent
 * @property {number} stick
 * @property {string} [benefit]
 * @property {number} [cat_currency_type]
 */

/**
 * Intento de contacto registrado contra un lead.
 * @typedef {Object} ContactAttempt
 * @property {number} [id]
 * @property {string} contact_datetime
 * @property {number} [attempt_origin_id]
 * @property {number} [calling_id]
 * @property {string} [observation]
 */

/**
 * Inscripcion de un lead a un programa.
 * @typedef {Object} Enrollment
 * @property {number} [enrollment_id]
 * @property {number} lead_id
 * @property {number} program_version_id
 * @property {number} [edition_id]
 * @property {number} montoOriginal
 * @property {number} [currency_id]
 * @property {Discount[]} [discounts]
 * @property {string} [fico_status_alias]
 */

/**
 * Lead comercial. Forma del registro devuelto por leadList/leadGet y consumido
 * por la tabla del listado.
 * @typedef {Object} Lead
 * @property {number} lead_id
 * @property {number} [person_id]
 * @property {string} [full_name]
 * @property {string} [phone]
 * @property {string} [origin_seller_phone]
 * @property {string} [program_text]
 * @property {number} [status_lead_id]
 * @property {number} [interest_level_id]
 * @property {number} [last_follow_id]
 * @property {number} [owner_user_id]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 * @property {Enrollment[]} [enrollments]
 */

/**
 * Chip visible en la barra de filtros activos.
 * @typedef {Object} FilterChip
 * @property {string} key
 * @property {string} [label]
 * @property {string} [text]
 * @property {string[]} [details]
 */

export {}
