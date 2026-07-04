import ActivityLog from "../models/ActivityLog.js";

/**
 * Utility function upang awtomatikong mag-save ng audit logs sa database.
 * @param {Object} user - Ang kasalukuyang user object (galing sa req.user o nilikhang user)
 * @param {String} module - Ang pangalan ng module (e.g., "User Management", "Raw Materials")
 * @param {String} operation - Uri ng aksyon (e.g., "CREATE", "UPDATE", "DELETE", "LOGIN")
 * @param {String} action - Detalyadong kwento o deskripsyon ng ginawa
 */
export const logActivity = async (user, module, operation, action) => {
  try {
    if (!user) return; 

    await ActivityLog.create({
      username: user.Username || user.username,
      role: user.SystemRole || user.role,
      module,
      operation,
      action,
    });
    
    console.log(`📝 Audit Log Created: [${module}] ni ${user.Username || user.username}`);
  } catch (error) {
    console.error("❌ Global Logger Error:", error.message);
  }
};