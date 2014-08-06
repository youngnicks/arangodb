# coding: utf-8

require 'rspec'
require 'arangodb.rb'

describe ArangoDB do
  api = "/_api/pregel"
  prefix = "api-pregel"
  executionNumber = "22"
  docId = ""

  context "internal pregel communication:" do

################################################################################
## pregel actions
################################################################################

    context "cleanup:" do
      before do
        for cn in ["P_work_" , "P_messages_", "P_global_" ] do
         ArangoDB.drop_collection(cn + executionNumber)
         @cid = ArangoDB.create_collection(cn + executionNumber)
        end
      end

      it "succesful cleanup" do
        for cn in ["P_work_" , "P_messages_", "P_global_" ] do
         ArangoDB.size_collection(cn + executionNumber).should eq(0)
        end
        cmd = api + '/cleanup' + "/" + executionNumber
        doc = ArangoDB.log_post("#{prefix}-cleanup", cmd)
	
        doc.code.should eq(200)
        doc.headers['content-type'].should eq("application/json; charset=utf-8")
        doc.parsed_response['error'].should eq(false)
        doc.parsed_response['code'].should eq(200)

        for cn in ["P_work_" , "P_messages_", "P_global_" ] do
         ArangoDB.size_collection(cn + executionNumber).should eq(nil)
        end

      end
      
       it "bad cleanup with missing executionNumber" do
        cmd = api + '/cleanup' + "/" 
        doc = ArangoDB.log_post("#{prefix}-cleanup-bad", cmd)
        doc.parsed_response['error'].should eq(true)
        doc.parsed_response['code'].should eq(400)
        doc.parsed_response['errorMessage'].should eq("invalid value for parameter 'executionNumber'")

      end
    end

    
    context "finishedStep:" do
      before do
        cmd = "/_api/document?collection=_pregel"
        body = "{ \"waitForAnswer\" : {\"localhost\" : false} , \"step\" : 0, \"state\" : \"running\", \"stepContent\" : [{\"active\" : 2 , \"messages\" : 8}, {\"active\" : 0 , \"messages\" : 0}]}"
        doc = ArangoDB.log_post("#{prefix}-accept", cmd, :body => body)
        docId = doc.parsed_response['_key']
      end
      
      after do
        cmd = "/_api/document/_pregel/" + docId
        doc = ArangoDB.log_delete("#{prefix}", cmd)
      end

      it "succesful finsihed step" do
        cmd = api + '/finishedStep'
        body = "{ \"server\" : \"localhost\", \"step\" : 0, \"executionNumber\" : \"" + docId +  "\", \"messages\" : 0, \"active\" : 0 }"
        doc = ArangoDB.log_post("#{prefix}-finishedStep", cmd , :body => body)
	doc.code.should eq(200)
	doc.parsed_response['error'].should eq(false)
        doc.parsed_response['code'].should eq(200)
        cmd = "/_api/document/_pregel/" + docId
        doc = ArangoDB.log_get("#{prefix}", cmd)
        doc.parsed_response['stepContent'][1]['active'].should eq(0)
        doc.parsed_response['stepContent'][1]['messages'].should eq(0)
      
      end
    end

    context "nextStep:" do
      before do
        cmd = "/_api/document?collection=_pregel"
        body = "{ \"waitForAnswer\" : {\"localhost\" : false} , \"step\" : 0, \"state\" : \"running\", \"stepContent\" : [{\"active\" : 2 , \"messages\" : 8}, {\"active\" : 0 , \"messages\" : 0}]}"
        doc = ArangoDB.log_post("#{prefix}-accept", cmd, :body => body)
        docId = doc.parsed_response['_key']
        for cn in ["vertex1" , "vertex2", "edge2", "P_" + docId + "_RESULT_vertex1" , "P_" + docId + "_RESULT_vertex2", "P_" + docId + "_RESULT_edge2" ] do
         ArangoDB.drop_collection(cn)
         @cid = ArangoDB.create_collection(cn)
        end
      end
      
      after do
        cmd = "/_api/document/_pregel/" + docId
        doc = ArangoDB.log_delete("#{prefix}", cmd)
        for cn in ["vertex1" , "vertex2", "edge2", "P_" + docId + "_RESULT_vertex1" , "P_" + docId + "_RESULT_vertex2", "P_" + docId + "_RESULT_edge2" ] do
         ArangoDB.drop_collection(cn)
        end
      end

      it "succesful next step" do
        cmd = api + '/nextStep'
        body = "{\"step\" : 0, \"executionNumber\" : \"" + docId +  "\", \"setup\" : {\"conductor\" : \"claus\"," +  
            "\"map\" : {\"vertex1\": {\"type\": 2, \"shardKeys\" : [\"a\", \"b\", \"c\"] ,\"resultCollection\": \"P_" + docId +  "_RESULT_vertex1\", \"originalShards\": {\"vertex1\" : \"localhost\"}, \"resultShards\": {\"P_" + docId + "_RESULT_vertex1\" : \"localhost\"}}," + 
            "\"vertex2\": {\"type\": 2,\"shardKeys\" : [\"a\", \"b\", \"c\"] ,\"resultCollection\": \"P_" + docId +  "_RESULT_vertex2\",\"originalShards\": {\"vertex2\" : \"localhost\"},\"resultShards\": {\"P_" + docId +  "_RESULT_vertex2\" : \"localhost\"}}," + 
            "\"edge2\": {\"type\": 3,\"shardKeys\" : [\"a\", \"b\", \"c\"] ,\"resultCollection\": \"P_" + docId +  "\_RESULT_edge2\",\"originalShards\": {\"edge2\" : \"localhost\"},\"resultShards\": {\"P_" + docId +  "_RESULT_edge2\" : \"localhost\"}}} } }"
        doc = ArangoDB.log_post("#{prefix}-nextStep", cmd , :body => body)
        doc.code.should eq(200)
        doc.parsed_response['error'].should eq(false)
        
      end
    end

    context "startExecution:" do
      before do
        cmd = "/_api/gharial"
        body = "{ \"name\" : \"pregelTest\" , \"edgeDefinitions\" : [{\"collection\": \"pregelTestEdges\", \"from\": [ \"pregelTestStartVertices\" ], \"to\": [ \"pregelTestEndVertices\" ]}]}"
        doc = ArangoDB.log_post("#{prefix}-accept", cmd, :body => body)
      end
      
      after do
        cmd = "/_api/gharial/pregelTest?dropCollections=true"
        doc = ArangoDB.log_delete("#{prefix}", cmd)
	cmd = "/_api/gharial/P_" + docId + "_RESULT_pregelTest?dropCollections=true"
        doc = ArangoDB.log_delete("#{prefix}", cmd)
        cmd = "/_api/document/_pregel/" + docId
        doc = ArangoDB.log_delete("#{prefix}", cmd)
      end

      it "succesful startExecution" do
        cmd = api + '/startExecution'
        body = "{\"graphName\" : \"pregelTest\", \"algorithm\" : \"function () {}\", \"options\" : {}}"
        doc = ArangoDB.log_post("#{prefix}-startExecution", cmd , :body => body)
        doc.code.should eq(200)
        docId = doc.parsed_response['executionNumber']
        docId.should be_kind_of(String)
        doc.parsed_response['error'].should eq(false)
        
      end
    end

   context "getResult:" do
      before do
        cmd = "/_api/gharial"
        body = "{ \"name\" : \"pregelTest\" , \"edgeDefinitions\" : [{\"collection\": \"pregelTestEdges\", \"from\": [ \"pregelTestStartVertices\" ], \"to\": [ \"pregelTestEndVertices\" ]}]}"
        doc = ArangoDB.log_post("#{prefix}-accept", cmd, :body => body)
      end
      
      after do
        cmd = "/_api/gharial/pregelTest?dropCollections=true"
        doc = ArangoDB.log_delete("#{prefix}", cmd)
        cmd = "/_api/gharial/P_" + docId + "_RESULT_pregelTest?dropCollections=true"
        doc = ArangoDB.log_delete("#{prefix}", cmd)
        cmd = "/_api/document/_pregel/" + docId
        doc = ArangoDB.log_delete("#{prefix}", cmd)
      end

      it "succesful getResult" do
        cmd = api + '/startExecution'
        body = "{\"graphName\" : \"pregelTest\", \"algorithm\" : \"function () {}\", \"options\" : {}}"
        doc = ArangoDB.log_post("#{prefix}-startExecution", cmd , :body => body)
	doc.code.should eq(200)
        docId = doc.parsed_response['executionNumber']
        docId.should be_kind_of(String)
	sleep(1.0)
        cmd = api + '/' + docId
        doc = ArangoDB.log_get("#{prefix}-startExecution", cmd)
        doc.code.should eq(200)
	result = doc.parsed_response['result']
        result['graphName'].should eq("P_" + docId + "_RESULT_pregelTest")
        doc.parsed_response['error'].should eq(false)
        
      end
      
      it "bad getResult with missing executionNumber" do
        cmd = api 
        doc = ArangoDB.log_get("#{prefix}-cleanup-bad", cmd)
        doc.parsed_response['error'].should eq(true)
        doc.parsed_response['code'].should eq(400)
        doc.parsed_response['errorMessage'].should eq("invalid value for parameter 'executionNumber'")

      end
      
    end

  end
end
