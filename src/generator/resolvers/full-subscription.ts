import {
  OptionalKind,
  MethodDeclarationStructure,
  Project,
  Writers,
} from "ts-morph";
import path from "path";

import {
  resolversFolderName,
  subscriptionResolversFolderName,
} from "../config";
import {
  generateTypeGraphQLImport,
  generateArgsImports,
  generateModelsImports,
  generateOutputsImports,
  generateGraphQLInfoImport,
  generateHelpersFileImport,
} from "../imports";
import { DmmfDocument } from "../dmmf/dmmf-document";
import { DMMF } from "../dmmf/types";
import { GeneratorOptions } from "../options";
import { generateOutputTypeClassFromType } from "../type-class";
import generateEnumFromDef from "../enum";

export default function generateSubscriptionResolverClassFromMapping(
  project: Project,
  baseDirPath: string,
  mapping: DMMF.ModelMapping,
  model: DMMF.Model,
  dmmfDocument: DmmfDocument,
  generatorOptions: GeneratorOptions,
) {
  generateEnumFromDef(project, baseDirPath, {
    name: "ChangeOutputActionEnum",
    typeName: "ChangeOutputActionEnum",
    valuesMap: [
      {
        name: "CREATE",
        value: "CREATE",
      },
      {
        name: "DELETE",
        value: "DELETE",
      },
      {
        name: "UPDATE",
        value: "UPDATE",
      },
      {
        name: "CREATE_MANY",
        value: "CREATE_MANY",
      },
      {
        name: "UPDATE_MANY",
        value: "UPDATE_MANY",
      },
      {
        name: "DELETE_MANY",
        value: "DELETE_MANY",
      },
    ],
    docs: undefined,
  });
  generateOutputTypeClassFromType(
    project,
    path.resolve(baseDirPath, resolversFolderName),
    {
      name: "ChangeOutput",
      fields: [
        {
          name: "action",
          isNullable: false,
          args: [],
          outputType: {
            isList: false,
            location: "enumTypes",
            type: "ChangeOutputActionEnum",
          },
          typeGraphQLType: "ChangeOutputActionEnum",
          fieldTSType: "ChangeOutputActionEnum",
          isRequired: true,
          argsTypeName: undefined,
        },
        {
          name: "id",
          isNullable: true,
          args: [],
          outputType: {
            isList: false,
            location: "scalar",
            type: "string",
          },
          typeGraphQLType: "String",
          fieldTSType: "string | undefined",
          isRequired: false,
          argsTypeName: undefined,
        },
      ],
      typeName: "ChangeOutput",
    },
    dmmfDocument,
  );
  const resolverDirPath = path.resolve(
    baseDirPath,
    resolversFolderName,
    subscriptionResolversFolderName,
    model.typeName,
  );
  const filePath = path.resolve(
    resolverDirPath,
    `${mapping.subscriptionResolverName}.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  generateTypeGraphQLImport(sourceFile);
  generateHelpersFileImport(sourceFile, 3);

  const distinctOutputTypesNames = [
    ...new Set(mapping.actions.map(it => it.outputTypeName)),
  ];
  const modelOutputTypeNames = distinctOutputTypesNames.filter(typeName =>
    dmmfDocument.isModelTypeName(typeName),
  );
  generateModelsImports(sourceFile, modelOutputTypeNames, 3);
  generateOutputsImports(sourceFile, ["ChangeOutput"], 2);

  sourceFile.addClass({
    name: mapping.subscriptionResolverName,
    isExported: true,
    decorators: [
      {
        name: "TypeGraphQL.Resolver",
        arguments: [`_of => ${model.typeName}`],
      },
    ],
    methods: [
      generateSubscriptionResolverClassMethodDeclaration(
        mapping,
        dmmfDocument,
        generatorOptions,
      ),
    ],
  });
}

export function generateSubscriptionResolverClassMethodDeclaration(
  mapping: DMMF.ModelMapping,
  dmmfDocument: DmmfDocument,
  generatorOptions: GeneratorOptions,
): OptionalKind<MethodDeclarationStructure> {
  return {
    name: `subscription${mapping.modelName}`,
    isAsync: true,
    returnType: `Promise<ChangeOutput>`,
    decorators: [
      {
        name: `TypeGraphQL.Subscription`,
        arguments: [
          `_returns => ChangeOutput`,
          Writers.object({
            // nullable: `${!action.method.isRequired}`,
            topics: /* ts */ `({ args, context }) => calculateSubTopicFromContext(context, "${mapping.modelName}")`,
          }),
        ],
      },
    ],
    parameters: [
      {
        name: "payload",
        type: "ChangeOutput",
        decorators: [{ name: "TypeGraphQL.Root", arguments: [] }],
      },
    ],
    statements: [/* ts */ ` return payload;`],
  };
}
