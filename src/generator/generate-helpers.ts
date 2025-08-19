import { SourceFile } from "ts-morph";
import {
  generateGraphQLFieldsImport,
  generateGraphQLInfoImport,
} from "./imports";
import { GeneratorOptions } from "./options";
import { DMMF } from "./dmmf/types";
import path from "path";

export function generateHelpersFile(
  sourceFile: SourceFile,
  options: GeneratorOptions,
) {
  generateGraphQLInfoImport(sourceFile);
  generateGraphQLFieldsImport(sourceFile);
  if(options.combineArgsTSFile) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: options.combineArgsTSFile,
      namedImports: ["combineArgsWithContextHelper"],
    })
  }

  if (options.calculateSubTopicTSFile) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: options.calculateSubTopicTSFile,
      namedImports: ["calculateSubTopicFromContextHelper"],
    })
  }

  if(options.postMutationActionTSFile) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: options.postMutationActionTSFile,
      namedImports: ["postMutationActionHelper"],
    })
  }

  sourceFile.addStatements(/* ts */ `
    export function transformInfoIntoPrismaArgs(info: GraphQLResolveInfo): Record<string, any> {
      const fields: Record<string, any> = graphqlFields(
        // suppress GraphQLResolveInfo types issue
        info as any,
        {},
        {
          excludedFields: ['__typename'],
          processArguments: true,
        }
      );
      return transformFields(fields);
    }
  `);

  sourceFile.addStatements(/* ts */ `
    function transformFields(fields: Record<string, any>): Record<string, any> {
      return Object.fromEntries(
        Object.entries(fields)
          .map<[string, any]>(([key, value]) => {
            if (Object.keys(value).length === 0) {
              return [key, true];
            }
            if ("__arguments" in value) {
              return [key, Object.fromEntries(
                value.__arguments.map((argument: object) => {
                  const [[key, { value }]] = Object.entries(argument);
                  return [key, value];
                })
              )];
            }
            return [key, transformFields(value)];
          }),
      );
    }
  `);

  sourceFile.addStatements(/* ts */ `
    export function getPrismaFromContext(context: any) {
      const prismaClient = context["${options.contextPrismaKey}"];
      if (!prismaClient) {
        throw new Error("Unable to find Prisma Client in GraphQL context. Please provide it under the \`context[\\"${options.contextPrismaKey}\\"]\` key.");
      }
      return prismaClient;
    }
  `);

  sourceFile.addStatements(/* ts */ `
    export function transformCountFieldIntoSelectRelationsCount(_count: object) {
      return {
        include: {
          _count: {
            select: {
              ...Object.fromEntries(
                Object.entries(_count).filter(([_, v]) => v != null)
              ),
            }
          },
        },
      }
    }
  `);

  if(options.combineArgsTSFile) {
    sourceFile.addStatements(/* ts */ `
      export const combineArgsWithContext = combineArgsWithContextHelper;
    `)
  } else {
    sourceFile.addStatements(/* ts */ `
      // You can create a file in the path specified inside combineArgsTSFile to use that combine logic
      export function combineArgsWithContext(args: any, context: any, collectionName: string, actionKind: string) {
        return args;
      }
    `);
  }

  if(options.calculateSubTopicTSFile) {
    sourceFile.addStatements(/* ts */ `
      export const calculateSubTopicFromContext = calculateSubTopicFromContextHelper;
    `)
  } else {
    sourceFile.addStatements(/* ts */ `
      // You can create a file in the path specified inside calculateSubTopicFromContext to use that combine logic
      export function calculateSubTopicFromContext(context: any, collectionName: string) {
        return collectionName;
      }
    `);
  }

  if(options.postMutationActionTSFile) {
    sourceFile.addStatements(/* ts */ `
      export const postMutationAction = postMutationActionHelper;
    `)
  } else {
    sourceFile.addStatements(/* ts */ `
      // You can create a file in the path specified inside postMutationAction to use that combine logic
      export async function postMutationAction(action: any, context: any, collectionName: string, actionKind: string) {
        return;
      }
    `);
  }
}
