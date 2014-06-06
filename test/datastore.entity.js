var assert = require('assert'),
    entity = require('../lib/datastore/entity.js');

var blogPostMetadata = {
  title:       { kind: String, indexed: true },
  tags:        { kind: String, multi: true, indexed: true },
  publishedAt: { kind: Date },
  author:      { kind: Object, indexed: true },
  isDraft:     { kind: Boolean, indexed: true }
}

describe('registerKind', function() {
  it('should be able to register valid field metadata', function(done) {
    entity.registerKind('namespace', 'kind', blogPostMetadata);
    done();
  });

  it('should set the namespace to be "default" if zero value or null is provided', function(done) {
    entity.registerKind(null, 'kind', blogPostMetadata);
    var meta = entity.getKind('default', 'kind');
    assert.strictEqual(meta, blogPostMetadata);
    done();
  });

  it('should throw an exception if an invalid kind is provided', function(done) {
    assert.throws(function() {
      entity.registerKind(null, '000', blogPostMetadata);
    }, /Kinds should match/);
    done();
  });
});

describe('keyFromKeyProto', function() {
   var proto = {
    partitionId: { namespace: 'default', datasetId: 'datasetId' },
    path:        [{ kind: 'Kind', name: 'Name' }]
  };

  var protoH = {
    partitionId: { namespace: 'Test', datasetId: 'datasetId' },
    path:        [{ kind: 'Kind', id: '111' }, { kind: 'Kind2', name: 'name' }]
  };

  var protoHIncomplete = {
    partitionId: { namespace: 'Test', datasetId: 'datasetId' },
    path:        [{ kind: 'Kind' }, { kind: 'Kind2' }]
  };

  it('should handle keys hierarchically', function(done) {
    var key = entity.keyFromKeyProto(protoH);
    assert.deepEqual(key, ['Test', 'Kind', 111, 'Kind2', 'name']);
    done();
  });

  it('should handle incomplete keys hierarchically', function(done) {
    var key = entity.keyFromKeyProto(protoHIncomplete);
    assert.deepEqual(key, ['Test', 'Kind', null, 'Kind2', null]);
    done();
  });

  it('should not set namespace if default', function(done) {
    var key = entity.keyFromKeyProto(proto);
    assert.deepEqual(key, ['Kind', 'Name']);
    done();
  });

});

describe('keyToKeyProto', function() {

  it('should handle hierarchical key definitions', function(done) {
    var key = ['Kind1', 1, 'Kind2', 'name'];
    var proto = entity.keyToKeyProto('datasetId', key);
    assert.strictEqual(proto.partitionId.datasetId, 'datasetId');
    assert.strictEqual(proto.partitionId.namespace, 'default');
    assert.strictEqual(proto.path[0].kind, 'Kind1');
    assert.strictEqual(proto.path[0].id, 1);
    assert.strictEqual(proto.path[0].name, undefined);
    assert.strictEqual(proto.path[1].kind, 'Kind2');
    assert.strictEqual(proto.path[1].id, undefined);
    assert.strictEqual(proto.path[1].name, 'name');
    done();
  });

  it('should detect the namespace of the hierarchical keys', function(done) {
    var key = ['Namespace', 'Kind1', 1, 'Kind2', 'name'];
    var proto = entity.keyToKeyProto('datasetId', key);
    assert.strictEqual(proto.partitionId.datasetId, 'datasetId');
    assert.strictEqual(proto.partitionId.namespace, 'Namespace');
    assert.strictEqual(proto.path[0].kind, 'Kind1');
    assert.strictEqual(proto.path[0].id, 1);
    assert.strictEqual(proto.path[0].name, undefined);
    assert.strictEqual(proto.path[1].kind, 'Kind2');
    assert.strictEqual(proto.path[1].id, undefined);
    assert.strictEqual(proto.path[1].name, 'name');
    done();
  });

  it('should handle incomplete keys with and without namespaces', function(done) {
    var key = ['Kind1', null];
    var keyWithNS = ['Namespace', 'Kind1', null];

    var proto = entity.keyToKeyProto('datasetId', key);
    var protoWithNS = entity.keyToKeyProto('datasetId', keyWithNS);

    assert.strictEqual(proto.partitionId.datasetId, 'datasetId');
    assert.strictEqual(proto.partitionId.namespace, 'default');
    assert.strictEqual(proto.path[0].kind, 'Kind1');
    assert.strictEqual(proto.path[0].id, undefined);
    assert.strictEqual(proto.path[0].name, undefined);

    assert.strictEqual(protoWithNS.partitionId.datasetId, 'datasetId');
    assert.strictEqual(protoWithNS.partitionId.namespace, 'Namespace');
    assert.strictEqual(protoWithNS.path[0].kind, 'Kind1');
    assert.strictEqual(protoWithNS.path[0].id, undefined);
    assert.strictEqual(protoWithNS.path[0].name, undefined);
    done();
  });

  it('should throw if key contains less than 2 items', function() {
    assert.throws(function() {
      entity.keyToKeyProto('datasetId', ['Kind']);
    });
  });

});

describe('isKeyComplete', function() {

  it('should return true if kind and one of the identifiers have non-zero values', function(done) {
    assert.strictEqual(entity.isKeyComplete(['Kind1', null]), false);
    assert.strictEqual(entity.isKeyComplete(['Kind1', 3]), true);
    assert.strictEqual(entity.isKeyComplete(['Namespace', 'Kind1', null]), false);
    assert.strictEqual(entity.isKeyComplete(['Namespace', 'Kind1', 'name']), true);
    done();
  });

});

describe('entityFromEntityProto', function() {

  it('should support boolean, integer, double, string, entity and list values', function(done) {
    var obj = entity.entityFromEntityProto(entityProto);
    assert.strictEqual(obj.createdAt.getTime(), new Date('2001-01-01').getTime());
    assert.strictEqual(obj.linkedTo.ns, undefined);
    assert.strictEqual(obj.linkedTo[0], 'Kind');
    assert.strictEqual(obj.linkedTo[1], 4790047639339008);
    assert.strictEqual(obj.name, 'Name');
    assert.strictEqual(obj.flagged, true);
    assert.deepEqual(obj.count, new entity.Int(5));
    assert.deepEqual(obj.total, new entity.Double(5.42));
    assert.strictEqual(obj.author.name, 'Burcu Dogan');
    assert.deepEqual(obj.list[0], new entity.Int(6));
    assert.strictEqual(obj.list[1], false);
    done();
  });

});

var keyProto = {
  "partitionId":{
     "datasetId":"s~bamboo-shift-xxx",
     "namespace":"default"
  },
  "path":[
     {
        "kind":"Kind",
        "id":"4790047639339008"
     }
  ]
};

var entityProto = {
   "properties":{
      "createdAt":{
         "dateTimeValue":"2001-01-01T00:00:00.000Z"
      },
      "linkedTo": {
         "keyValue": keyProto
      },
      "name":{
         "stringValue":"Name"
      },
      "flagged":{
         "booleanValue":true
      },
      "count":{
         "integerValue":"5"
      },
      "total":{
         "doubleValue": "5.42"
      },
      "author": {
         "entityValue": {
             "properties": {
                "name": { "stringValue": "Burcu Dogan" }
             }
         }
      },
      "list": {
         "listValue": [{ "integerValue": "6" }, { "booleanValue": false }]
      }
   }
};
