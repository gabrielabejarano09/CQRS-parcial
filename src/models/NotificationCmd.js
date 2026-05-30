const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('NotificationCmd', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    otp: { type: DataTypes.STRING(10), allowNull: false },
    provider: { type: DataTypes.STRING(20), allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
    synced: { type: DataTypes.BOOLEAN, defaultValue: false },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'notifications_cmd',
    timestamps: true
  });
};