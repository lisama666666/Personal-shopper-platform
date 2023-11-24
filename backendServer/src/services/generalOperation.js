const mongoose = require("mongoose");

class generalOperation {
  /** Insert Single Record
   * @description Insert Single Record In Any collection
   * @param  {object} data -  form information
   * @param  {string} tableName -  Collection Name In Which Insert The Record
   */

  static async addLogs(data) {
    const Table = mongoose.model(`Log`);
    const info = new Table(data);
    info.save();
  }



  static async addRecord(tableName, data) {
    const Table = mongoose.model(`${tableName}`);
    const info = new Table(data);
    return await info.save();
  }

  static async getDistinctIds(tableName, key, condition) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.distinct(key, condition);
  }



  static async addStock(tableName, data, opts) {
    const Table = mongoose.model(`${tableName}`);
    const info = new Table(data);
    return await info.save(opts);
  }

  static async addManyRecord(tableName, data) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.insertMany(data)
  }

  static async updateManyRecord(TableName, condition, setObj) {
    const Table = mongoose.model(`${TableName}`);
    return await Table.update(
      condition,
      setObj,
      { multi: true }
    );
  }

  static async updateRecord(TableName, cond, data) {
    const Table = mongoose.model(`${TableName}`);
    return await Table.findOneAndUpdate(
      cond,
      { $set: data },
      { new: true }
    );
  }

  /**
   * @param  {object} condition - key value pair for applying condition if you need all data send
   * empty condition {}
   * @param  {string} TableName - id of dhs form object
   */

  static async getRecord(tableName, condition) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.find(condition);
  }

  static async getLimitedAndSortedRecord(tableName, condition, sort, limit) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.find(condition).sort(sort).limit(limit);
  }
  static async getRecordAndSort(tableName, condition, sort) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.find(condition).sort(sort);
  }

  static async recordCollation(tableName, condition, refNameWithRequireField) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.find(condition).collation({ locale: 'en', strength: 1 }).limit(3);
  }

  /**
   * @param  {object} condition - key value pair for applying condition if you need all data send
   * empty condition {}
   * @param  {string} TableName - id of dhs form object
   */

  static async getRecordWithPagination(tableName, condition, options) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.paginate(condition, options);
  }

  /**
   * @param  {object} condition - key value pair for applying condition if you need all data send
   * empty condition {}
   * @param  {string} TableName - id of dhs form object
   */

  static async getRecordAggregate(tableName, aggregateArray) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.aggregate(aggregateArray);
  }

  

  /**
   * @param  {object} condition - condition is key value pair for deleting specific if you want to truncate the table
   * send empty condition e.g {}
   * @param  {string} TableName - id of dhs form object
   */

  static async deleteRecord(tableName, condition) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.deleteMany(condition);
  }

  /**
   * @param  {object} condition - condition is key value pair for deleting specific if you want to truncate the table
   * send empty condition e.g {}
   * @param  {string} TableName - id of dhs form object
   */

  static async findAndModifyRecord(tableName, condition, update) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.findOneAndUpdate(condition, update, {
      upsert: true,
      returnNewDocument: true,
      new: true
    });
  }

  static async findOneAndReplaceRecord(tableName, condition, update) {
    const Table = mongoose.model(`${tableName}`);
    return await Table.findOneAndReplace(condition, update, {
      upsert: true,
      returnNewDocument: true,
      new: true
    });
  }





}

module.exports = generalOperation;
