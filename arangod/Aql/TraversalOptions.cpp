////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2016-2016 ArangoDB GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is ArangoDB GmbH, Cologne, Germany
///
/// @author Michael Hackstein
////////////////////////////////////////////////////////////////////////////////

#include "Aql/TraversalOptions.h"

#include <velocypack/velocypack-aliases.h>

using namespace arangodb::aql;
using Json = arangodb::basics::Json;
using JsonHelper = arangodb::basics::JsonHelper;

TraversalOptions::TraversalOptions(Json const& json) {
  Json obj = json.get("traversalFlags");
  useBreathFirst = JsonHelper::getBooleanValue(obj.json(), "bfs", false);
  std::string tmp = JsonHelper::getStringValue(obj.json(), "vertexUniqueness", "");
  if (tmp == "path") {
    vertexUniqueness = PATH;
  } else if (tmp == "global") {
    vertexUniqueness = GLOBAL;
  } else {
    vertexUniqueness = NONE;
  }

  tmp = JsonHelper::getStringValue(obj.json(), "edgeUniqueness", "");
  if (tmp == "none") {
    vertexUniqueness = NONE;
  } else if (tmp == "global") {
    vertexUniqueness = GLOBAL;
  } else {
    vertexUniqueness = PATH;
  }
}

void TraversalOptions::toJson(arangodb::basics::Json& json,
                              TRI_memory_zone_t* zone) const {
  Json flags;

  flags = Json(Json::Object, 3);
  flags("bfs", Json(useBreathFirst));

  switch (vertexUniqueness) {
    case NONE:
      flags("vertexUniqueness", Json("none"));
      break;
    case PATH:
      flags("vertexUniqueness", Json("path"));
      break;
    case GLOBAL:
      flags("vertexUniqueness", Json("global"));
      break;
  }

  switch (edgeUniqueness) {
    case NONE:
      flags("edgeUniqueness", Json("none"));
      break;
    case PATH:
      flags("edgeUniqueness", Json("path"));
      break;
    case GLOBAL:
      flags("edgeUniqueness", Json("global"));
      break;
  }

  json("traversalFlags", flags);
}

void TraversalOptions::toVelocyPack(VPackBuilder& builder) const {
  VPackObjectBuilder guard(&builder);

  builder.add("bfs", VPackValue(useBreathFirst));

  switch (vertexUniqueness) {
    case NONE:
      builder.add("vertexUniqueness", VPackValue("none"));
      break;
    case PATH:
      builder.add("vertexUniqueness", VPackValue("path"));
      break;
    case GLOBAL:
      builder.add("vertexUniqueness", VPackValue("global"));
      break;
  }

  switch (edgeUniqueness) {
    case NONE:
      builder.add("edgeUniqueness", VPackValue("none"));
      break;
    case PATH:
      builder.add("edgeUniqueness", VPackValue("path"));
      break;
    case GLOBAL:
      builder.add("edgeUniqueness", VPackValue("global"));
      break;
  }
}
