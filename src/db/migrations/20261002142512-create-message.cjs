'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // UP - create the 'message' table
    await queryInterface.createTable(
      'message',
      {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          unique: true,
          autoIncrement: true,
        },
        conversation: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'conversation',
            key: 'id',
          },
          onDelete: 'RESTRICT',
          onDelete: 'CASCADE',
        },
        sender: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'user',
            key: 'id',
          },
          onDelete: 'RESTRICT',
          onDelete: 'CASCADE',
        },
        body: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        send_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // DOWN - drop the 'message' table
    await queryInterface.dropTable('message');
  }
};
