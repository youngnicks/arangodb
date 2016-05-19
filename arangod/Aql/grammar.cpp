/* A Bison parser, made by GNU Bison 3.0.4.  */

/* Bison implementation for Yacc-like parsers in C

   Copyright (C) 1984, 1989-1990, 2000-2015 Free Software Foundation, Inc.

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.  */

/* As a special exception, you may create a larger work that contains
   part or all of the Bison parser skeleton and distribute that work
   under terms of your choice, so long as that work isn't itself a
   parser generator using the skeleton or a modified version thereof
   as a parser skeleton.  Alternatively, if you modify or redistribute
   the parser skeleton itself, you may (at your option) remove this
   special exception, which will cause the skeleton and the resulting
   Bison output files to be licensed under the GNU General Public
   License without this special exception.

   This special exception was added by the Free Software Foundation in
   version 2.2 of Bison.  */

/* C LALR(1) parser skeleton written by Richard Stallman, by
   simplifying the original so-called "semantic" parser.  */

/* All symbols defined below should begin with yy or YY, to avoid
   infringing on user name space.  This should be done even for local
   variables, as they might otherwise be expanded by user macros.
   There are some unavoidable exceptions within include files to
   define necessary library symbols; they are noted "INFRINGES ON
   USER NAME SPACE" below.  */

/* Identify Bison output.  */
#define YYBISON 1

/* Bison version.  */
#define YYBISON_VERSION "3.0.4"

/* Skeleton name.  */
#define YYSKELETON_NAME "yacc.c"

/* Pure parsers.  */
#define YYPURE 1

/* Push parsers.  */
#define YYPUSH 0

/* Pull parsers.  */
#define YYPULL 1


/* Substitute the variable and function names.  */
#define yyparse         Aqlparse
#define yylex           Aqllex
#define yyerror         Aqlerror
#define yydebug         Aqldebug
#define yynerrs         Aqlnerrs


/* Copy the first part of user declarations.  */
#line 9 "Aql/grammar.y" /* yacc.c:339  */

#include "Aql/AstNode.h"
#include "Aql/CollectNode.h"
#include "Aql/Function.h"
#include "Aql/Parser.h"
#include "Aql/Quantifier.h"
#include "Basics/conversions.h"
#include "Basics/tri-strings.h"

#line 82 "Aql/grammar.cpp" /* yacc.c:339  */

# ifndef YY_NULLPTR
#  if defined __cplusplus && 201103L <= __cplusplus
#   define YY_NULLPTR nullptr
#  else
#   define YY_NULLPTR 0
#  endif
# endif

/* Enabling verbose error messages.  */
#ifdef YYERROR_VERBOSE
# undef YYERROR_VERBOSE
# define YYERROR_VERBOSE 1
#else
# define YYERROR_VERBOSE 1
#endif

/* In a future release of Bison, this section will be replaced
   by #include "grammar.hpp".  */
#ifndef YY_AQL_AQL_GRAMMAR_HPP_INCLUDED
# define YY_AQL_AQL_GRAMMAR_HPP_INCLUDED
/* Debug traces.  */
#ifndef YYDEBUG
# define YYDEBUG 0
#endif
#if YYDEBUG
extern int Aqldebug;
#endif

/* Token type.  */
#ifndef YYTOKENTYPE
# define YYTOKENTYPE
  enum yytokentype
  {
    T_END = 0,
    T_FOR = 258,
    T_LET = 259,
    T_FILTER = 260,
    T_RETURN = 261,
    T_COLLECT = 262,
    T_SORT = 263,
    T_LIMIT = 264,
    T_ASC = 265,
    T_DESC = 266,
    T_IN = 267,
    T_WITH = 268,
    T_INTO = 269,
    T_AGGREGATE = 270,
    T_GRAPH = 271,
    T_SHORTEST_PATH = 272,
    T_DISTINCT = 273,
    T_REMOVE = 274,
    T_INSERT = 275,
    T_UPDATE = 276,
    T_REPLACE = 277,
    T_UPSERT = 278,
    T_NULL = 279,
    T_TRUE = 280,
    T_FALSE = 281,
    T_STRING = 282,
    T_QUOTED_STRING = 283,
    T_INTEGER = 284,
    T_DOUBLE = 285,
    T_PARAMETER = 286,
    T_ASSIGN = 287,
    T_NOT = 288,
    T_AND = 289,
    T_OR = 290,
    T_NIN = 291,
    T_EQ = 292,
    T_NE = 293,
    T_LT = 294,
    T_GT = 295,
    T_LE = 296,
    T_GE = 297,
    T_LIKE = 298,
    T_PLUS = 299,
    T_MINUS = 300,
    T_TIMES = 301,
    T_DIV = 302,
    T_MOD = 303,
    T_QUESTION = 304,
    T_COLON = 305,
    T_SCOPE = 306,
    T_RANGE = 307,
    T_COMMA = 308,
    T_OPEN = 309,
    T_CLOSE = 310,
    T_OBJECT_OPEN = 311,
    T_OBJECT_CLOSE = 312,
    T_ARRAY_OPEN = 313,
    T_ARRAY_CLOSE = 314,
    T_OUTBOUND = 315,
    T_INBOUND = 316,
    T_ANY = 317,
    T_ALL = 318,
    T_NONE = 319,
    UMINUS = 320,
    UPLUS = 321,
    FUNCCALL = 322,
    REFERENCE = 323,
    INDEXED = 324,
    EXPANSION = 325
  };
#endif

/* Value type.  */
#if ! defined YYSTYPE && ! defined YYSTYPE_IS_DECLARED

union YYSTYPE
{
#line 19 "Aql/grammar.y" /* yacc.c:355  */

  arangodb::aql::AstNode*  node;
  struct {
    char*                  value;
    size_t                 length;
  }                        strval;
  bool                     boolval;
  int64_t                  intval;

#line 204 "Aql/grammar.cpp" /* yacc.c:355  */
};

typedef union YYSTYPE YYSTYPE;
# define YYSTYPE_IS_TRIVIAL 1
# define YYSTYPE_IS_DECLARED 1
#endif

/* Location type.  */
#if ! defined YYLTYPE && ! defined YYLTYPE_IS_DECLARED
typedef struct YYLTYPE YYLTYPE;
struct YYLTYPE
{
  int first_line;
  int first_column;
  int last_line;
  int last_column;
};
# define YYLTYPE_IS_DECLARED 1
# define YYLTYPE_IS_TRIVIAL 1
#endif



int Aqlparse (arangodb::aql::Parser* parser);

#endif /* !YY_AQL_AQL_GRAMMAR_HPP_INCLUDED  */

/* Copy the second part of user declarations.  */
#line 29 "Aql/grammar.y" /* yacc.c:358  */


using namespace arangodb::aql;

////////////////////////////////////////////////////////////////////////////////
/// @brief shortcut macro for signaling out of memory
////////////////////////////////////////////////////////////////////////////////

#define ABORT_OOM                                   \
  parser->registerError(TRI_ERROR_OUT_OF_MEMORY);   \
  YYABORT;

#define scanner parser->scanner()

////////////////////////////////////////////////////////////////////////////////
/// @brief forward for lexer function defined in Aql/tokens.ll
////////////////////////////////////////////////////////////////////////////////

int Aqllex (YYSTYPE*, 
            YYLTYPE*, 
            void*);
 
////////////////////////////////////////////////////////////////////////////////
/// @brief register parse error
////////////////////////////////////////////////////////////////////////////////

void Aqlerror (YYLTYPE* locp, 
               arangodb::aql::Parser* parser,
               char const* message) {
  parser->registerParseError(TRI_ERROR_QUERY_PARSE, message, locp->first_line, locp->first_column);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief check if any of the variables used in the INTO expression were 
/// introduced by the COLLECT itself, in which case it would fail
////////////////////////////////////////////////////////////////////////////////
         
static Variable const* CheckIntoVariables(AstNode const* collectVars, 
                                          std::unordered_set<Variable const*> const& vars) {
  if (collectVars == nullptr || collectVars->type != NODE_TYPE_ARRAY) {
    return nullptr;
  }

  size_t const n = collectVars->numMembers();
  for (size_t i = 0; i < n; ++i) {
    auto member = collectVars->getMember(i);

    if (member != nullptr) {
      TRI_ASSERT(member->type == NODE_TYPE_ASSIGN);
      auto v = static_cast<Variable*>(member->getMember(0)->getData());
      if (vars.find(v) != vars.end()) {
        return v;
      }
    }
  }

  return nullptr;
}

////////////////////////////////////////////////////////////////////////////////
/// @brief register variables in the scope
////////////////////////////////////////////////////////////////////////////////

static void RegisterAssignVariables(arangodb::aql::Scopes* scopes, AstNode const* vars) { 
  size_t const n = vars->numMembers();
  for (size_t i = 0; i < n; ++i) {
    auto member = vars->getMember(i);

    if (member != nullptr) {
      TRI_ASSERT(member->type == NODE_TYPE_ASSIGN);
      auto v = static_cast<Variable*>(member->getMember(0)->getData());
      scopes->addVariable(v);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
/// @brief validate the aggregate variables expressions
////////////////////////////////////////////////////////////////////////////////

static bool ValidateAggregates(Parser* parser, AstNode const* aggregates) {
  size_t const n = aggregates->numMembers();

  for (size_t i = 0; i < n; ++i) {
    auto member = aggregates->getMember(i);

    if (member != nullptr) {
      TRI_ASSERT(member->type == NODE_TYPE_ASSIGN);
      auto func = member->getMember(1);

      bool isValid = true;
      if (func->type != NODE_TYPE_FCALL) {
        // aggregate expression must be a function call
        isValid = false;
      }
      else {
        auto f = static_cast<arangodb::aql::Function*>(func->getData());
        if (! Aggregator::isSupported(f->externalName)) {
          // aggregate expression must be a call to MIN|MAX|LENGTH...
          isValid = false;
        }
      }

      if (! isValid) {
        parser->registerError(TRI_ERROR_QUERY_INVALID_AGGREGATE_EXPRESSION);
        return false;
      }
    }
  }

  return true;
}

////////////////////////////////////////////////////////////////////////////////
/// @brief start a new scope for the collect
////////////////////////////////////////////////////////////////////////////////

static bool StartCollectScope(arangodb::aql::Scopes* scopes) { 
  // check if we are in the main scope
  if (scopes->type() == arangodb::aql::AQL_SCOPE_MAIN) {
    return false;
  } 

  // end the active scopes
  scopes->endNested();
  // start a new scope
  scopes->start(arangodb::aql::AQL_SCOPE_COLLECT);
  return true;
}

////////////////////////////////////////////////////////////////////////////////
/// @brief get the INTO variable stored in a node (may not exist)
////////////////////////////////////////////////////////////////////////////////

static AstNode const* GetIntoVariable(Parser* parser, AstNode const* node) {
  if (node == nullptr) {
    return nullptr;
  }

  if (node->type == NODE_TYPE_VALUE) {
    // node is a string containing the variable name
    return parser->ast()->createNodeVariable(node->getStringValue(), node->getStringLength(), true);
  }

  // node is an array with the variable name as the first member
  TRI_ASSERT(node->type == NODE_TYPE_ARRAY);
  TRI_ASSERT(node->numMembers() == 2);

  auto v = node->getMember(0);
  TRI_ASSERT(v->type == NODE_TYPE_VALUE);
  return parser->ast()->createNodeVariable(v->getStringValue(), v->getStringLength(), true);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief get the INTO variable = expression stored in a node (may not exist)
////////////////////////////////////////////////////////////////////////////////

static AstNode const* GetIntoExpression(AstNode const* node) {
  if (node == nullptr || node->type == NODE_TYPE_VALUE) {
    return nullptr;
  }

  // node is an array with the expression as the second member
  TRI_ASSERT(node->type == NODE_TYPE_ARRAY);
  TRI_ASSERT(node->numMembers() == 2);

  return node->getMember(1);
}


#line 404 "Aql/grammar.cpp" /* yacc.c:358  */

#ifdef short
# undef short
#endif

#ifdef YYTYPE_UINT8
typedef YYTYPE_UINT8 yytype_uint8;
#else
typedef unsigned char yytype_uint8;
#endif

#ifdef YYTYPE_INT8
typedef YYTYPE_INT8 yytype_int8;
#else
typedef signed char yytype_int8;
#endif

#ifdef YYTYPE_UINT16
typedef YYTYPE_UINT16 yytype_uint16;
#else
typedef unsigned short int yytype_uint16;
#endif

#ifdef YYTYPE_INT16
typedef YYTYPE_INT16 yytype_int16;
#else
typedef short int yytype_int16;
#endif

#ifndef YYSIZE_T
# ifdef __SIZE_TYPE__
#  define YYSIZE_T __SIZE_TYPE__
# elif defined size_t
#  define YYSIZE_T size_t
# elif ! defined YYSIZE_T
#  include <stddef.h> /* INFRINGES ON USER NAME SPACE */
#  define YYSIZE_T size_t
# else
#  define YYSIZE_T unsigned int
# endif
#endif

#define YYSIZE_MAXIMUM ((YYSIZE_T) -1)

#ifndef YY_
# if defined YYENABLE_NLS && YYENABLE_NLS
#  if ENABLE_NLS
#   include <libintl.h> /* INFRINGES ON USER NAME SPACE */
#   define YY_(Msgid) dgettext ("bison-runtime", Msgid)
#  endif
# endif
# ifndef YY_
#  define YY_(Msgid) Msgid
# endif
#endif

#ifndef YY_ATTRIBUTE
# if (defined __GNUC__                                               \
      && (2 < __GNUC__ || (__GNUC__ == 2 && 96 <= __GNUC_MINOR__)))  \
     || defined __SUNPRO_C && 0x5110 <= __SUNPRO_C
#  define YY_ATTRIBUTE(Spec) __attribute__(Spec)
# else
#  define YY_ATTRIBUTE(Spec) /* empty */
# endif
#endif

#ifndef YY_ATTRIBUTE_PURE
# define YY_ATTRIBUTE_PURE   YY_ATTRIBUTE ((__pure__))
#endif

#ifndef YY_ATTRIBUTE_UNUSED
# define YY_ATTRIBUTE_UNUSED YY_ATTRIBUTE ((__unused__))
#endif

#if !defined _Noreturn \
     && (!defined __STDC_VERSION__ || __STDC_VERSION__ < 201112)
# if defined _MSC_VER && 1200 <= _MSC_VER
#  define _Noreturn __declspec (noreturn)
# else
#  define _Noreturn YY_ATTRIBUTE ((__noreturn__))
# endif
#endif

/* Suppress unused-variable warnings by "using" E.  */
#if ! defined lint || defined __GNUC__
# define YYUSE(E) ((void) (E))
#else
# define YYUSE(E) /* empty */
#endif

#if defined __GNUC__ && 407 <= __GNUC__ * 100 + __GNUC_MINOR__
/* Suppress an incorrect diagnostic about yylval being uninitialized.  */
# define YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN \
    _Pragma ("GCC diagnostic push") \
    _Pragma ("GCC diagnostic ignored \"-Wuninitialized\"")\
    _Pragma ("GCC diagnostic ignored \"-Wmaybe-uninitialized\"")
# define YY_IGNORE_MAYBE_UNINITIALIZED_END \
    _Pragma ("GCC diagnostic pop")
#else
# define YY_INITIAL_VALUE(Value) Value
#endif
#ifndef YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
# define YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
# define YY_IGNORE_MAYBE_UNINITIALIZED_END
#endif
#ifndef YY_INITIAL_VALUE
# define YY_INITIAL_VALUE(Value) /* Nothing. */
#endif


#if ! defined yyoverflow || YYERROR_VERBOSE

/* The parser invokes alloca or malloc; define the necessary symbols.  */

# ifdef YYSTACK_USE_ALLOCA
#  if YYSTACK_USE_ALLOCA
#   ifdef __GNUC__
#    define YYSTACK_ALLOC __builtin_alloca
#   elif defined __BUILTIN_VA_ARG_INCR
#    include <alloca.h> /* INFRINGES ON USER NAME SPACE */
#   elif defined _AIX
#    define YYSTACK_ALLOC __alloca
#   elif defined _MSC_VER
#    include <malloc.h> /* INFRINGES ON USER NAME SPACE */
#    define alloca _alloca
#   else
#    define YYSTACK_ALLOC alloca
#    if ! defined _ALLOCA_H && ! defined EXIT_SUCCESS
#     include <stdlib.h> /* INFRINGES ON USER NAME SPACE */
      /* Use EXIT_SUCCESS as a witness for stdlib.h.  */
#     ifndef EXIT_SUCCESS
#      define EXIT_SUCCESS 0
#     endif
#    endif
#   endif
#  endif
# endif

# ifdef YYSTACK_ALLOC
   /* Pacify GCC's 'empty if-body' warning.  */
#  define YYSTACK_FREE(Ptr) do { /* empty */; } while (0)
#  ifndef YYSTACK_ALLOC_MAXIMUM
    /* The OS might guarantee only one guard page at the bottom of the stack,
       and a page size can be as small as 4096 bytes.  So we cannot safely
       invoke alloca (N) if N exceeds 4096.  Use a slightly smaller number
       to allow for a few compiler-allocated temporary stack slots.  */
#   define YYSTACK_ALLOC_MAXIMUM 4032 /* reasonable circa 2006 */
#  endif
# else
#  define YYSTACK_ALLOC YYMALLOC
#  define YYSTACK_FREE YYFREE
#  ifndef YYSTACK_ALLOC_MAXIMUM
#   define YYSTACK_ALLOC_MAXIMUM YYSIZE_MAXIMUM
#  endif
#  if (defined __cplusplus && ! defined EXIT_SUCCESS \
       && ! ((defined YYMALLOC || defined malloc) \
             && (defined YYFREE || defined free)))
#   include <stdlib.h> /* INFRINGES ON USER NAME SPACE */
#   ifndef EXIT_SUCCESS
#    define EXIT_SUCCESS 0
#   endif
#  endif
#  ifndef YYMALLOC
#   define YYMALLOC malloc
#   if ! defined malloc && ! defined EXIT_SUCCESS
void *malloc (YYSIZE_T); /* INFRINGES ON USER NAME SPACE */
#   endif
#  endif
#  ifndef YYFREE
#   define YYFREE free
#   if ! defined free && ! defined EXIT_SUCCESS
void free (void *); /* INFRINGES ON USER NAME SPACE */
#   endif
#  endif
# endif
#endif /* ! defined yyoverflow || YYERROR_VERBOSE */


#if (! defined yyoverflow \
     && (! defined __cplusplus \
         || (defined YYLTYPE_IS_TRIVIAL && YYLTYPE_IS_TRIVIAL \
             && defined YYSTYPE_IS_TRIVIAL && YYSTYPE_IS_TRIVIAL)))

/* A type that is properly aligned for any stack member.  */
union yyalloc
{
  yytype_int16 yyss_alloc;
  YYSTYPE yyvs_alloc;
  YYLTYPE yyls_alloc;
};

/* The size of the maximum gap between one aligned stack and the next.  */
# define YYSTACK_GAP_MAXIMUM (sizeof (union yyalloc) - 1)

/* The size of an array large to enough to hold all stacks, each with
   N elements.  */
# define YYSTACK_BYTES(N) \
     ((N) * (sizeof (yytype_int16) + sizeof (YYSTYPE) + sizeof (YYLTYPE)) \
      + 2 * YYSTACK_GAP_MAXIMUM)

# define YYCOPY_NEEDED 1

/* Relocate STACK from its old location to the new one.  The
   local variables YYSIZE and YYSTACKSIZE give the old and new number of
   elements in the stack, and YYPTR gives the new location of the
   stack.  Advance YYPTR to a properly aligned location for the next
   stack.  */
# define YYSTACK_RELOCATE(Stack_alloc, Stack)                           \
    do                                                                  \
      {                                                                 \
        YYSIZE_T yynewbytes;                                            \
        YYCOPY (&yyptr->Stack_alloc, Stack, yysize);                    \
        Stack = &yyptr->Stack_alloc;                                    \
        yynewbytes = yystacksize * sizeof (*Stack) + YYSTACK_GAP_MAXIMUM; \
        yyptr += yynewbytes / sizeof (*yyptr);                          \
      }                                                                 \
    while (0)

#endif

#if defined YYCOPY_NEEDED && YYCOPY_NEEDED
/* Copy COUNT objects from SRC to DST.  The source and destination do
   not overlap.  */
# ifndef YYCOPY
#  if defined __GNUC__ && 1 < __GNUC__
#   define YYCOPY(Dst, Src, Count) \
      __builtin_memcpy (Dst, Src, (Count) * sizeof (*(Src)))
#  else
#   define YYCOPY(Dst, Src, Count)              \
      do                                        \
        {                                       \
          YYSIZE_T yyi;                         \
          for (yyi = 0; yyi < (Count); yyi++)   \
            (Dst)[yyi] = (Src)[yyi];            \
        }                                       \
      while (0)
#  endif
# endif
#endif /* !YYCOPY_NEEDED */

/* YYFINAL -- State number of the termination state.  */
#define YYFINAL  7
/* YYLAST -- Last index in YYTABLE.  */
#define YYLAST   1325

/* YYNTOKENS -- Number of terminals.  */
#define YYNTOKENS  72
/* YYNNTS -- Number of nonterminals.  */
#define YYNNTS  92
/* YYNRULES -- Number of rules.  */
#define YYNRULES  216
/* YYNSTATES -- Number of states.  */
#define YYNSTATES  372

/* YYTRANSLATE[YYX] -- Symbol number corresponding to YYX as returned
   by yylex, with out-of-bounds checking.  */
#define YYUNDEFTOK  2
#define YYMAXUTOK   325

#define YYTRANSLATE(YYX)                                                \
  ((unsigned int) (YYX) <= YYMAXUTOK ? yytranslate[YYX] : YYUNDEFTOK)

/* YYTRANSLATE[TOKEN-NUM] -- Symbol number corresponding to TOKEN-NUM
   as returned by yylex, without out-of-bounds checking.  */
static const yytype_uint8 yytranslate[] =
{
       0,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,    71,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     1,     2,     3,     4,
       5,     6,     7,     8,     9,    10,    11,    12,    13,    14,
      15,    16,    17,    18,    19,    20,    21,    22,    23,    24,
      25,    26,    27,    28,    29,    30,    31,    32,    33,    34,
      35,    36,    37,    38,    39,    40,    41,    42,    43,    44,
      45,    46,    47,    48,    49,    50,    51,    52,    53,    54,
      55,    56,    57,    58,    59,    60,    61,    62,    63,    64,
      65,    66,    67,    68,    69,    70
};

#if YYDEBUG
  /* YYRLINE[YYN] -- Source line where rule number YYN was defined.  */
static const yytype_uint16 yyrline[] =
{
       0,   365,   365,   368,   379,   383,   387,   394,   396,   396,
     407,   412,   417,   419,   422,   425,   428,   431,   437,   439,
     444,   446,   448,   450,   452,   454,   456,   458,   460,   462,
     464,   469,   475,   477,   482,   487,   492,   500,   508,   519,
     527,   532,   534,   539,   546,   556,   556,   570,   579,   590,
     620,   687,   712,   745,   747,   752,   759,   762,   765,   774,
     788,   805,   805,   819,   819,   829,   829,   840,   843,   849,
     855,   858,   861,   864,   870,   875,   882,   890,   893,   899,
     909,   919,   927,   938,   943,   951,   962,   967,   970,   976,
     976,  1027,  1030,  1033,  1039,  1039,  1049,  1055,  1058,  1061,
    1064,  1067,  1070,  1076,  1079,  1095,  1095,  1104,  1104,  1114,
    1117,  1120,  1126,  1129,  1132,  1135,  1138,  1141,  1144,  1147,
    1150,  1153,  1156,  1159,  1162,  1165,  1168,  1171,  1177,  1180,
    1183,  1186,  1189,  1192,  1195,  1198,  1204,  1210,  1212,  1217,
    1220,  1220,  1236,  1239,  1245,  1248,  1254,  1254,  1263,  1265,
    1270,  1273,  1279,  1282,  1296,  1296,  1305,  1307,  1312,  1314,
    1319,  1333,  1337,  1346,  1353,  1356,  1362,  1365,  1371,  1374,
    1377,  1383,  1386,  1392,  1395,  1403,  1407,  1418,  1422,  1429,
    1434,  1434,  1442,  1451,  1460,  1463,  1466,  1472,  1475,  1481,
    1513,  1516,  1519,  1526,  1536,  1536,  1549,  1564,  1578,  1592,
    1592,  1635,  1638,  1644,  1651,  1661,  1664,  1667,  1670,  1673,
    1679,  1682,  1685,  1695,  1701,  1704,  1709
};
#endif

#if YYDEBUG || YYERROR_VERBOSE || 1
/* YYTNAME[SYMBOL-NUM] -- String name of the symbol SYMBOL-NUM.
   First, the terminals, then, starting at YYNTOKENS, nonterminals.  */
static const char *const yytname[] =
{
  "\"end of query string\"", "error", "$undefined", "\"FOR declaration\"",
  "\"LET declaration\"", "\"FILTER declaration\"",
  "\"RETURN declaration\"", "\"COLLECT declaration\"",
  "\"SORT declaration\"", "\"LIMIT declaration\"", "\"ASC keyword\"",
  "\"DESC keyword\"", "\"IN keyword\"", "\"WITH keyword\"",
  "\"INTO keyword\"", "\"AGGREGATE keyword\"", "\"GRAPH keyword\"",
  "\"SHORTEST_PATH keyword\"", "\"DISTINCT modifier\"",
  "\"REMOVE command\"", "\"INSERT command\"", "\"UPDATE command\"",
  "\"REPLACE command\"", "\"UPSERT command\"", "\"null\"", "\"true\"",
  "\"false\"", "\"identifier\"", "\"quoted string\"", "\"integer number\"",
  "\"number\"", "\"bind parameter\"", "\"assignment\"", "\"not operator\"",
  "\"and operator\"", "\"or operator\"", "\"not in operator\"",
  "\"== operator\"", "\"!= operator\"", "\"< operator\"", "\"> operator\"",
  "\"<= operator\"", "\">= operator\"", "\"like operator\"",
  "\"+ operator\"", "\"- operator\"", "\"* operator\"", "\"/ operator\"",
  "\"% operator\"", "\"?\"", "\":\"", "\"::\"", "\"..\"", "\",\"", "\"(\"",
  "\")\"", "\"{\"", "\"}\"", "\"[\"", "\"]\"", "\"outbound modifier\"",
  "\"inbound modifier\"", "\"any modifier\"", "\"all modifier\"",
  "\"none modifier\"", "UMINUS", "UPLUS", "FUNCCALL", "REFERENCE",
  "INDEXED", "EXPANSION", "'.'", "$accept", "with_collection",
  "with_collection_list", "optional_with", "$@1", "queryStart", "query",
  "final_statement", "optional_statement_block_statements",
  "statement_block_statement", "for_statement", "traversal_statement",
  "shortest_path_statement", "filter_statement", "let_statement",
  "let_list", "let_element", "count_into", "collect_variable_list", "$@2",
  "collect_statement", "collect_list", "collect_element",
  "collect_optional_into", "variable_list", "keep", "$@3", "aggregate",
  "$@4", "sort_statement", "$@5", "sort_list", "sort_element",
  "sort_direction", "limit_statement", "return_statement",
  "in_or_into_collection", "remove_statement", "insert_statement",
  "update_parameters", "update_statement", "replace_parameters",
  "replace_statement", "update_or_replace", "upsert_statement", "$@6",
  "quantifier", "distinct_expression", "$@7", "expression",
  "function_name", "function_call", "$@8", "$@9", "operator_unary",
  "operator_binary", "operator_ternary",
  "optional_function_call_arguments", "expression_or_query", "$@10",
  "function_arguments_list", "compound_value", "array", "$@11",
  "optional_array_elements", "array_elements_list", "options", "object",
  "$@12", "optional_object_elements", "object_elements_list",
  "object_element", "array_filter_operator", "optional_array_filter",
  "optional_array_limit", "optional_array_return", "graph_collection",
  "graph_collection_list", "graph_subject", "$@13", "graph_direction",
  "graph_direction_steps", "reference", "$@14", "$@15", "simple_value",
  "numeric_value", "value_literal", "collection_name", "bind_parameter",
  "object_element_name", "variable_name", YY_NULLPTR
};
#endif

# ifdef YYPRINT
/* YYTOKNUM[NUM] -- (External) token number corresponding to the
   (internal) symbol number NUM (which must be that of a token).  */
static const yytype_uint16 yytoknum[] =
{
       0,   256,   257,   258,   259,   260,   261,   262,   263,   264,
     265,   266,   267,   268,   269,   270,   271,   272,   273,   274,
     275,   276,   277,   278,   279,   280,   281,   282,   283,   284,
     285,   286,   287,   288,   289,   290,   291,   292,   293,   294,
     295,   296,   297,   298,   299,   300,   301,   302,   303,   304,
     305,   306,   307,   308,   309,   310,   311,   312,   313,   314,
     315,   316,   317,   318,   319,   320,   321,   322,   323,   324,
     325,    46
};
# endif

#define YYPACT_NINF -331

#define yypact_value_is_default(Yystate) \
  (!!((Yystate) == (-331)))

#define YYTABLE_NINF -215

#define yytable_value_is_error(Yytable_value) \
  0

  /* YYPACT[STATE-NUM] -- Index in YYTABLE of the portion describing
     STATE-NUM.  */
static const yytype_int16 yypact[] =
{
       8,  -331,  -331,    14,    65,  -331,   416,  -331,  -331,  -331,
    -331,   -11,  -331,    47,    47,  1231,    98,   117,  -331,    73,
    1231,  1231,  1231,  1231,  -331,  -331,  -331,  -331,  -331,  -331,
      42,  -331,  -331,  -331,  -331,    24,    33,    52,    58,    64,
      65,  -331,  -331,  -331,  -331,    -3,   -25,  -331,     3,  -331,
    -331,  -331,    30,  -331,  -331,  -331,  1231,    66,  1231,  1231,
    1231,  -331,  -331,  1023,    86,  -331,  -331,  -331,  -331,  -331,
    -331,  -331,   -41,  -331,  -331,  -331,  -331,  -331,  1023,    85,
    -331,    94,    47,   124,  1231,   105,  -331,  -331,   680,   680,
    -331,   518,  -331,   559,  1231,    47,    94,   112,   124,  -331,
    1139,    47,    47,  1231,  -331,  -331,  -331,  -331,   718,  -331,
      -5,  1231,  1231,  1231,  1231,  1231,  1231,  1231,  1231,  1231,
    1231,  1231,  1231,  1231,  1231,  1231,  1231,  1231,  1231,  1231,
    -331,  -331,  -331,   187,   133,  -331,  1161,   120,  1231,   166,
      47,   131,  -331,   147,  -331,   171,    94,   151,  -331,   439,
      73,  1253,    87,    94,    94,  1231,    94,  1231,    94,   756,
     174,  -331,   131,    94,  -331,    94,  -331,  -331,  -331,   597,
     193,  1231,    -2,  -331,  1023,  1196,  -331,   159,   165,  -331,
     167,  1231,   161,   177,  -331,   169,  1023,   186,   180,  1273,
    1098,  1061,  1273,   196,   196,   150,   150,   150,   150,   196,
     144,   144,  -331,  -331,  -331,   794,   224,  1231,  1231,  1231,
    1231,  1231,  1231,  1231,  1231,  -331,  1196,  -331,   833,   200,
    -331,  -331,  1023,    47,   147,  -331,    47,  1231,  -331,  1231,
    -331,  -331,  -331,  -331,  -331,    40,   343,   407,  -331,  -331,
    -331,  -331,  -331,  -331,  -331,   680,  -331,   680,  -331,  1231,
    1231,    47,  -331,  -331,   244,  -331,  1231,   477,  1139,    47,
    1023,   194,  -331,  -331,   197,  -331,  1231,   871,  -331,    -5,
    1231,  -331,  1231,  1231,  1273,  1273,   196,   196,   150,   150,
     150,   150,   199,  -331,  -331,   215,  -331,  -331,  1023,  -331,
      94,    94,   641,  1023,   198,  -331,   909,   154,  -331,   202,
      94,   128,  -331,   597,   235,  1231,   254,  -331,  -331,  1231,
    1023,   223,  -331,  1023,  1023,  1023,  -331,  1231,   269,  -331,
    -331,  -331,  -331,  1231,    47,  1231,  -331,  -331,  -331,  -331,
    -331,  -331,  1231,   477,  1139,  -331,  1231,  1023,  1231,   281,
     680,  -331,   477,   -23,   947,    94,  -331,  1231,  1023,   985,
    1231,   230,    94,    94,  -331,   237,  1231,  -331,   477,  1231,
    1023,  -331,  -331,  -331,   -23,   477,    94,  1023,  -331,    94,
    -331,  -331
};

  /* YYDEFACT[STATE-NUM] -- Default reduction number in state STATE-NUM.
     Performed when YYTABLE does not specify something else to do.  Zero
     means the default is an error.  */
static const yytype_uint8 yydefact[] =
{
       7,     8,    18,     0,     0,    10,     0,     1,     2,   213,
       4,     9,     3,     0,     0,     0,     0,    45,    65,     0,
       0,     0,     0,     0,    89,    11,    19,    20,    22,    21,
      56,    23,    24,    25,    12,    26,    27,    28,    29,    30,
       0,     6,   216,    32,    33,     0,    40,    41,     0,   207,
     208,   209,   189,   205,   203,   204,     0,     0,     0,     0,
     194,   154,   146,    39,     0,   192,    97,    98,    99,   190,
     144,   145,   101,   206,   100,   191,    94,    76,    96,     0,
      63,   152,     0,    56,     0,    74,   201,   202,     0,     0,
      83,     0,    86,     0,     0,     0,   152,   152,    56,     5,
       0,     0,     0,     0,   111,   107,   109,   110,     0,    18,
     156,   148,     0,     0,     0,     0,     0,     0,     0,     0,
       0,     0,     0,     0,     0,     0,     0,     0,     0,     0,
      92,    91,    93,     0,     0,   105,     0,     0,     0,     0,
       0,     0,    47,    46,    53,     0,   152,    66,    67,    70,
       0,     0,     0,   152,   152,     0,   152,     0,   152,     0,
      57,    48,    61,   152,    51,   152,   184,   185,   186,    31,
     187,     0,     0,    42,    43,   140,   193,     0,   160,   215,
       0,     0,     0,   157,   158,     0,   150,     0,   149,   125,
     113,   112,   126,   119,   120,   121,   122,   123,   124,   127,
     114,   115,   116,   117,   118,     0,   102,     0,     0,     0,
       0,     0,     0,     0,     0,   104,   140,   164,     0,   199,
     196,   197,    95,     0,    64,   153,     0,     0,    49,     0,
      71,    72,    69,    73,    75,   189,   205,   213,    77,   210,
     211,   212,    78,    79,    80,     0,    81,     0,    84,     0,
       0,     0,    52,    50,   186,   188,     0,     0,     0,     0,
     139,     0,   142,    18,   138,   195,     0,     0,   155,     0,
       0,   147,     0,     0,   134,   135,   128,   129,   130,   131,
     132,   133,     0,   198,   165,   166,    44,    54,    55,    68,
     152,   152,     0,    58,    62,    59,     0,     0,   173,   179,
     152,     0,   174,     0,   187,     0,     0,   108,   141,   140,
     162,     0,   159,   161,   151,   136,   106,     0,   168,    82,
      85,    87,    88,     0,     0,     0,   183,   182,   180,    34,
     175,   176,     0,     0,     0,   143,     0,   167,     0,   171,
       0,    60,     0,     0,     0,   152,   187,     0,   163,   169,
       0,     0,   152,   152,   177,   181,     0,    35,     0,     0,
     172,   200,    90,    37,     0,     0,   152,   170,   178,   152,
      36,    38
};

  /* YYPGOTO[NTERM-NUM].  */
static const yytype_int16 yypgoto[] =
{
    -331,     1,  -331,  -331,  -331,  -331,  -106,  -331,  -331,  -331,
    -331,  -331,  -331,  -331,  -331,  -331,   190,   264,  -331,  -331,
    -331,   155,    70,   -29,  -331,  -331,  -331,   268,  -331,  -331,
    -331,  -331,    72,  -331,  -331,  -331,   -64,  -331,  -331,  -331,
    -331,  -331,  -331,  -331,  -331,  -331,  -331,  -331,  -331,    50,
    -331,  -331,  -331,  -331,  -331,  -331,  -331,    88,    -7,  -331,
    -331,  -331,  -331,  -331,  -331,  -331,   -78,  -130,  -331,  -331,
    -331,    34,  -331,  -331,  -331,  -331,  -330,  -331,  -149,  -331,
     -69,  -252,  -331,  -331,  -331,    -1,  -331,   -14,   153,    -4,
    -331,   -12
};

  /* YYDEFGOTO[NTERM-NUM].  */
static const yytype_int16 yydefgoto[] =
{
      -1,    10,    11,     2,     4,     3,     5,    25,     6,    26,
      27,    43,    44,    28,    29,    46,    47,    81,    30,    82,
      31,   143,   144,    97,   294,   163,   251,    83,   140,    32,
      84,   147,   148,   232,    33,    34,   153,    35,    36,    90,
      37,    92,    38,   323,    39,    94,   133,    77,   138,   260,
      64,    65,   216,   175,    66,    67,    68,   261,   262,   263,
     264,    69,    70,   111,   187,   188,   142,    71,   110,   182,
     183,   184,   219,   318,   339,   351,   299,   355,   300,   343,
     301,   171,    72,   109,   285,    85,    73,    74,   238,    75,
     185,   145
};

  /* YYTABLE[YYPACT[STATE-NUM]] -- What to do in state STATE-NUM.  If
     positive, shift that token.  If negative, reduce the rule whose
     number is the opposite.  If YYTABLE_NINF, syntax error.  */
static const yytype_int16 yytable[] =
{
      12,    45,    48,   177,   298,    86,   305,    12,     9,   100,
     258,   225,    41,   354,     7,    87,     8,   136,   161,   164,
       9,     1,   178,   179,   -13,   154,   180,   156,   102,   158,
     137,   170,   225,   -14,   368,   103,    12,   166,   167,   168,
    -210,    99,    40,  -210,  -210,  -210,  -210,  -210,  -210,  -210,
     101,   259,   -15,   181,   146,    79,    95,    80,   -16,  -210,
    -210,  -210,  -210,  -210,   -17,    63,    78,  -210,   228,   165,
      88,    89,    91,    93,    42,   243,   244,   -13,   246,   -13,
     248,  -103,   347,   160,  -103,   252,   -14,   253,   -14,   172,
      48,  -103,     8,  -210,  -103,  -210,     9,    49,    50,    51,
     255,    53,    54,    55,     9,   -15,   104,   -15,   106,   107,
     108,   -16,   139,   -16,   239,   240,    76,   -17,   241,   -17,
     105,   141,    49,    50,    51,    52,    53,    54,    55,     9,
      79,    56,    80,   221,   149,    86,    86,   134,    95,   162,
     135,    57,    58,    59,   159,    87,    87,   220,   233,   234,
     169,     9,    60,   174,    61,   330,    62,   308,   150,     9,
     215,   186,   189,   190,   191,   192,   193,   194,   195,   196,
     197,   198,   199,   200,   201,   202,   203,   204,   205,   206,
     223,   290,   326,   291,   345,     9,   218,    61,   222,   304,
     125,   126,   127,   353,   123,   124,   125,   126,   127,   207,
     226,   189,   129,   227,   229,   245,   250,   247,   112,   366,
     256,   286,   319,   320,   265,  -214,   369,   266,   268,   270,
     317,   257,   329,   208,   209,   210,   211,   212,   213,   214,
     269,   267,   115,   272,   255,   118,   119,   120,   121,   295,
     123,   124,   125,   126,   127,   271,   284,   306,   129,   307,
     309,   324,   332,   302,   316,   328,   -92,   274,   275,   276,
     277,   278,   279,   280,   281,   346,   334,   357,   123,   124,
     125,   126,   127,   336,   362,   363,   352,   288,   338,   149,
     -92,   -92,   -92,   -92,   -92,   -92,   -92,   350,   370,   361,
     364,   371,   173,   327,    96,   224,   287,   331,    98,   292,
     293,   289,   335,   312,   282,   242,   296,     0,   303,     0,
       0,     0,   341,     0,     0,     0,   310,     0,     0,     0,
     313,     0,   314,   315,     0,     0,     0,     0,     0,   302,
       0,     0,     0,     0,     0,     0,     0,     0,   302,   302,
       0,     0,     0,  -211,     0,     0,  -211,  -211,  -211,  -211,
    -211,  -211,  -211,     0,   302,   333,     0,     0,     0,     0,
     302,   302,  -211,  -211,  -211,  -211,  -211,   337,     0,     0,
    -211,     0,     0,   340,     0,   342,     0,     0,     0,     0,
       0,     0,   344,     0,   303,     0,   348,     0,   349,     0,
       0,     0,     0,     0,     0,     0,  -211,   358,  -211,     0,
     360,     0,     0,     0,     0,     0,   365,  -212,     0,   367,
    -212,  -212,  -212,  -212,  -212,  -212,  -212,     0,     0,    13,
      14,    15,    16,    17,    18,    19,  -212,  -212,  -212,  -212,
    -212,     0,     0,     0,  -212,    20,    21,    22,    23,    24,
       0,     0,     0,     0,     0,     0,     0,     0,     0,   230,
     231,   112,     0,     0,     0,     0,     0,     0,     0,     0,
    -212,     0,  -212,    49,    50,    51,     0,    53,    54,    55,
       9,     0,     0,   113,   114,   115,   116,   117,   118,   119,
     120,   121,   122,   123,   124,   125,   126,   127,   128,   112,
       0,   129,     0,   297,     0,     0,     0,     0,     0,     0,
       0,   130,   131,   132,   298,     0,     0,     0,     9,     0,
       0,   113,   114,   115,   116,   117,   118,   119,   120,   121,
     122,   123,   124,   125,   126,   127,   128,     0,     0,   129,
     151,   155,   152,     0,     0,     0,     0,   166,   167,   254,
     131,   132,     0,     0,     0,     0,     0,     0,     0,     0,
       0,     0,   113,   114,   115,   116,   117,   118,   119,   120,
     121,   122,   123,   124,   125,   126,   127,   128,     0,     0,
     129,   151,   157,   152,     0,     0,     0,     0,     0,     0,
     130,   131,   132,     0,     0,     0,     0,     0,     0,     0,
       0,     0,     0,   113,   114,   115,   116,   117,   118,   119,
     120,   121,   122,   123,   124,   125,   126,   127,   128,   112,
       0,   129,     0,     0,     0,     0,     0,     0,     0,     0,
       0,   130,   131,   132,     0,     0,     0,     0,     0,     0,
       0,   113,   114,   115,   116,   117,   118,   119,   120,   121,
     122,   123,   124,   125,   126,   127,   128,     0,     0,   129,
       0,     0,     0,   112,     0,     0,     0,   166,   167,   254,
     131,   132,   321,   322,     0,     0,     0,     0,     0,     0,
       0,     0,     0,     0,     0,   113,   114,   115,   116,   117,
     118,   119,   120,   121,   122,   123,   124,   125,   126,   127,
     128,     0,   151,   129,   152,     0,     0,     0,     0,     0,
       0,     0,     0,   130,   131,   132,     0,     0,     0,     0,
       0,     0,     0,     0,   113,   114,   115,   116,   117,   118,
     119,   120,   121,   122,   123,   124,   125,   126,   127,   128,
     112,     0,   129,     0,     0,     0,     0,     0,     0,     0,
       0,     0,   130,   131,   132,     0,     0,     0,     0,     0,
       0,     0,   113,   114,   115,   116,   117,   118,   119,   120,
     121,   122,   123,   124,   125,   126,   127,   128,   112,     0,
     129,     0,     0,   176,     0,     0,   249,     0,     0,     0,
     130,   131,   132,     0,     0,     0,     0,     0,     0,     0,
     113,   114,   115,   116,   117,   118,   119,   120,   121,   122,
     123,   124,   125,   126,   127,   128,   112,     0,   129,     0,
       0,     0,     0,     0,     0,     0,     0,     0,   130,   131,
     132,     0,     0,     0,     0,     0,     0,     0,   113,   114,
     115,   116,   117,   118,   119,   120,   121,   122,   123,   124,
     125,   126,   127,   128,   273,   112,   129,     0,     0,     0,
       0,     0,     0,     0,     0,     0,   130,   131,   132,     0,
       0,     0,     0,     0,     0,     0,     0,   113,   114,   115,
     116,   117,   118,   119,   120,   121,   122,   123,   124,   125,
     126,   127,   128,   112,     0,   129,     0,     0,     0,     0,
       0,     0,   283,     0,     0,   130,   131,   132,     0,     0,
       0,     0,     0,     0,     0,   113,   114,   115,   116,   117,
     118,   119,   120,   121,   122,   123,   124,   125,   126,   127,
     128,   112,     0,   129,     0,     0,     0,     0,     0,     0,
     311,     0,     0,   130,   131,   132,   325,     0,     0,     0,
       0,     0,     0,   113,   114,   115,   116,   117,   118,   119,
     120,   121,   122,   123,   124,   125,   126,   127,   128,   112,
       0,   129,     0,     0,     0,     0,     0,     0,     0,     0,
       0,   130,   131,   132,   356,     0,     0,     0,     0,     0,
       0,   113,   114,   115,   116,   117,   118,   119,   120,   121,
     122,   123,   124,   125,   126,   127,   128,   112,     0,   129,
       0,     0,     0,     0,     0,     0,     0,     0,     0,   130,
     131,   132,     0,     0,     0,     0,     0,     0,     0,   113,
     114,   115,   116,   117,   118,   119,   120,   121,   122,   123,
     124,   125,   126,   127,   128,   112,     0,   129,   359,     0,
       0,     0,     0,     0,     0,     0,     0,   130,   131,   132,
       0,     0,     0,     0,     0,     0,     0,   113,   114,   115,
     116,   117,   118,   119,   120,   121,   122,   123,   124,   125,
     126,   127,   128,   112,     0,   129,     0,     0,     0,     0,
       0,     0,     0,     0,     0,   130,   131,   132,     0,     0,
       0,     0,     0,     0,     0,   113,     0,   115,   116,   117,
     118,   119,   120,   121,   122,   123,   124,   125,   126,   127,
     112,     0,     0,   129,     0,     0,     0,     0,     0,     0,
       0,     0,     0,   130,   131,   132,     0,     0,     0,     0,
       0,     0,     0,     0,   115,   116,   117,   118,   119,   120,
     121,   122,   123,   124,   125,   126,   127,     0,     0,     0,
     129,     0,     0,     0,     0,     0,     0,     0,     0,     0,
     130,   131,   132,    49,    50,    51,    52,    53,    54,    55,
       9,     0,    56,     0,     0,     0,     0,     0,     0,     0,
       0,     0,    57,    58,    59,    49,    50,    51,    52,    53,
      54,    55,     9,    60,    56,    61,     0,    62,     0,   166,
     167,   168,     0,     0,    57,    58,    59,   217,     0,     0,
       0,     0,     0,     0,     0,    60,     0,    61,     0,    62,
      49,    50,    51,    52,    53,    54,    55,     9,     0,    56,
       0,     0,     0,     0,     0,     0,     0,     0,     0,    57,
      58,    59,     0,     0,     0,     0,     0,     0,     0,     0,
      60,  -137,    61,     0,    62,    49,    50,    51,    52,    53,
      54,    55,     9,     0,    56,     0,     0,     0,     0,     0,
       0,     0,     0,     0,    57,    58,    59,    49,    50,    51,
     235,   236,    54,    55,   237,    60,    56,    61,     0,    62,
       0,     0,     0,     0,     0,     0,    57,    58,    59,     0,
       0,     0,     0,     0,     0,     0,     0,    60,     0,    61,
       0,    62,   118,   119,   120,   121,     0,   123,   124,   125,
     126,   127,     0,     0,     0,   129
};

static const yytype_int16 yycheck[] =
{
       4,    13,    14,   109,    27,    19,   258,    11,    31,    12,
      12,   141,    11,   343,     0,    19,    27,    58,    96,    97,
      31,    13,    27,    28,     0,    89,    31,    91,    53,    93,
      71,   100,   162,     0,   364,    32,    40,    60,    61,    62,
       0,    40,    53,     3,     4,     5,     6,     7,     8,     9,
      53,    53,     0,    58,    83,    13,    14,    15,     0,    19,
      20,    21,    22,    23,     0,    15,    16,    27,   146,    98,
      20,    21,    22,    23,    27,   153,   154,    53,   156,    55,
     158,    51,   334,    95,    54,   163,    53,   165,    55,   101,
     102,    51,    27,    53,    54,    55,    31,    24,    25,    26,
     169,    28,    29,    30,    31,    53,    56,    55,    58,    59,
      60,    53,    27,    55,    27,    28,    18,    53,    31,    55,
      54,    27,    24,    25,    26,    27,    28,    29,    30,    31,
      13,    33,    15,   137,    84,   149,   150,    51,    14,    27,
      54,    43,    44,    45,    94,   149,   150,    27,   149,   150,
     100,    31,    54,   103,    56,    27,    58,   263,    53,    31,
      27,   111,   112,   113,   114,   115,   116,   117,   118,   119,
     120,   121,   122,   123,   124,   125,   126,   127,   128,   129,
      14,   245,    28,   247,   333,    31,   136,    56,   138,   258,
      46,    47,    48,   342,    44,    45,    46,    47,    48,    12,
      53,   151,    52,    32,    53,   155,    32,   157,    12,   358,
      17,   223,   290,   291,    55,    50,   365,    50,    57,    50,
       5,   171,   300,    36,    37,    38,    39,    40,    41,    42,
      53,   181,    36,    53,   303,    39,    40,    41,    42,   251,
      44,    45,    46,    47,    48,    59,    46,   259,    52,    55,
      53,    53,    17,   257,    55,    53,    12,   207,   208,   209,
     210,   211,   212,   213,   214,   334,    12,   345,    44,    45,
      46,    47,    48,    50,   352,   353,   340,   227,     9,   229,
      36,    37,    38,    39,    40,    41,    42,     6,   366,    59,
      53,   369,   102,   297,    30,   140,   226,   301,    30,   249,
     250,   229,   309,   269,   216,   152,   256,    -1,   258,    -1,
      -1,    -1,   324,    -1,    -1,    -1,   266,    -1,    -1,    -1,
     270,    -1,   272,   273,    -1,    -1,    -1,    -1,    -1,   333,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,   342,   343,
      -1,    -1,    -1,     0,    -1,    -1,     3,     4,     5,     6,
       7,     8,     9,    -1,   358,   305,    -1,    -1,    -1,    -1,
     364,   365,    19,    20,    21,    22,    23,   317,    -1,    -1,
      27,    -1,    -1,   323,    -1,   325,    -1,    -1,    -1,    -1,
      -1,    -1,   332,    -1,   334,    -1,   336,    -1,   338,    -1,
      -1,    -1,    -1,    -1,    -1,    -1,    53,   347,    55,    -1,
     350,    -1,    -1,    -1,    -1,    -1,   356,     0,    -1,   359,
       3,     4,     5,     6,     7,     8,     9,    -1,    -1,     3,
       4,     5,     6,     7,     8,     9,    19,    20,    21,    22,
      23,    -1,    -1,    -1,    27,    19,    20,    21,    22,    23,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    10,
      11,    12,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      53,    -1,    55,    24,    25,    26,    -1,    28,    29,    30,
      31,    -1,    -1,    34,    35,    36,    37,    38,    39,    40,
      41,    42,    43,    44,    45,    46,    47,    48,    49,    12,
      -1,    52,    -1,    16,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    62,    63,    64,    27,    -1,    -1,    -1,    31,    -1,
      -1,    34,    35,    36,    37,    38,    39,    40,    41,    42,
      43,    44,    45,    46,    47,    48,    49,    -1,    -1,    52,
      12,    13,    14,    -1,    -1,    -1,    -1,    60,    61,    62,
      63,    64,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    34,    35,    36,    37,    38,    39,    40,    41,
      42,    43,    44,    45,    46,    47,    48,    49,    -1,    -1,
      52,    12,    13,    14,    -1,    -1,    -1,    -1,    -1,    -1,
      62,    63,    64,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    -1,    34,    35,    36,    37,    38,    39,    40,
      41,    42,    43,    44,    45,    46,    47,    48,    49,    12,
      -1,    52,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    62,    63,    64,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    34,    35,    36,    37,    38,    39,    40,    41,    42,
      43,    44,    45,    46,    47,    48,    49,    -1,    -1,    52,
      -1,    -1,    -1,    12,    -1,    -1,    -1,    60,    61,    62,
      63,    64,    21,    22,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    -1,    -1,    -1,    34,    35,    36,    37,    38,
      39,    40,    41,    42,    43,    44,    45,    46,    47,    48,
      49,    -1,    12,    52,    14,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    -1,    62,    63,    64,    -1,    -1,    -1,    -1,
      -1,    -1,    -1,    -1,    34,    35,    36,    37,    38,    39,
      40,    41,    42,    43,    44,    45,    46,    47,    48,    49,
      12,    -1,    52,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    62,    63,    64,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    34,    35,    36,    37,    38,    39,    40,    41,
      42,    43,    44,    45,    46,    47,    48,    49,    12,    -1,
      52,    -1,    -1,    55,    -1,    -1,    20,    -1,    -1,    -1,
      62,    63,    64,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      34,    35,    36,    37,    38,    39,    40,    41,    42,    43,
      44,    45,    46,    47,    48,    49,    12,    -1,    52,    -1,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    62,    63,
      64,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    34,    35,
      36,    37,    38,    39,    40,    41,    42,    43,    44,    45,
      46,    47,    48,    49,    50,    12,    52,    -1,    -1,    -1,
      -1,    -1,    -1,    -1,    -1,    -1,    62,    63,    64,    -1,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    34,    35,    36,
      37,    38,    39,    40,    41,    42,    43,    44,    45,    46,
      47,    48,    49,    12,    -1,    52,    -1,    -1,    -1,    -1,
      -1,    -1,    59,    -1,    -1,    62,    63,    64,    -1,    -1,
      -1,    -1,    -1,    -1,    -1,    34,    35,    36,    37,    38,
      39,    40,    41,    42,    43,    44,    45,    46,    47,    48,
      49,    12,    -1,    52,    -1,    -1,    -1,    -1,    -1,    -1,
      59,    -1,    -1,    62,    63,    64,    27,    -1,    -1,    -1,
      -1,    -1,    -1,    34,    35,    36,    37,    38,    39,    40,
      41,    42,    43,    44,    45,    46,    47,    48,    49,    12,
      -1,    52,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    62,    63,    64,    27,    -1,    -1,    -1,    -1,    -1,
      -1,    34,    35,    36,    37,    38,    39,    40,    41,    42,
      43,    44,    45,    46,    47,    48,    49,    12,    -1,    52,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    62,
      63,    64,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    34,
      35,    36,    37,    38,    39,    40,    41,    42,    43,    44,
      45,    46,    47,    48,    49,    12,    -1,    52,    53,    -1,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    62,    63,    64,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    34,    35,    36,
      37,    38,    39,    40,    41,    42,    43,    44,    45,    46,
      47,    48,    49,    12,    -1,    52,    -1,    -1,    -1,    -1,
      -1,    -1,    -1,    -1,    -1,    62,    63,    64,    -1,    -1,
      -1,    -1,    -1,    -1,    -1,    34,    -1,    36,    37,    38,
      39,    40,    41,    42,    43,    44,    45,    46,    47,    48,
      12,    -1,    -1,    52,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    -1,    62,    63,    64,    -1,    -1,    -1,    -1,
      -1,    -1,    -1,    -1,    36,    37,    38,    39,    40,    41,
      42,    43,    44,    45,    46,    47,    48,    -1,    -1,    -1,
      52,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      62,    63,    64,    24,    25,    26,    27,    28,    29,    30,
      31,    -1,    33,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    43,    44,    45,    24,    25,    26,    27,    28,
      29,    30,    31,    54,    33,    56,    -1,    58,    -1,    60,
      61,    62,    -1,    -1,    43,    44,    45,    46,    -1,    -1,
      -1,    -1,    -1,    -1,    -1,    54,    -1,    56,    -1,    58,
      24,    25,    26,    27,    28,    29,    30,    31,    -1,    33,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    43,
      44,    45,    -1,    -1,    -1,    -1,    -1,    -1,    -1,    -1,
      54,    55,    56,    -1,    58,    24,    25,    26,    27,    28,
      29,    30,    31,    -1,    33,    -1,    -1,    -1,    -1,    -1,
      -1,    -1,    -1,    -1,    43,    44,    45,    24,    25,    26,
      27,    28,    29,    30,    31,    54,    33,    56,    -1,    58,
      -1,    -1,    -1,    -1,    -1,    -1,    43,    44,    45,    -1,
      -1,    -1,    -1,    -1,    -1,    -1,    -1,    54,    -1,    56,
      -1,    58,    39,    40,    41,    42,    -1,    44,    45,    46,
      47,    48,    -1,    -1,    -1,    52
};

  /* YYSTOS[STATE-NUM] -- The (internal number of the) accessing
     symbol of state STATE-NUM.  */
static const yytype_uint8 yystos[] =
{
       0,    13,    75,    77,    76,    78,    80,     0,    27,    31,
      73,    74,   161,     3,     4,     5,     6,     7,     8,     9,
      19,    20,    21,    22,    23,    79,    81,    82,    85,    86,
      90,    92,   101,   106,   107,   109,   110,   112,   114,   116,
      53,    73,    27,    83,    84,   163,    87,    88,   163,    24,
      25,    26,    27,    28,    29,    30,    33,    43,    44,    45,
      54,    56,    58,   121,   122,   123,   126,   127,   128,   133,
     134,   139,   154,   158,   159,   161,    18,   119,   121,    13,
      15,    89,    91,    99,   102,   157,   159,   161,   121,   121,
     111,   121,   113,   121,   117,    14,    89,    95,    99,    73,
      12,    53,    53,    32,   121,    54,   121,   121,   121,   155,
     140,   135,    12,    34,    35,    36,    37,    38,    39,    40,
      41,    42,    43,    44,    45,    46,    47,    48,    49,    52,
      62,    63,    64,   118,    51,    54,    58,    71,   120,    27,
     100,    27,   138,    93,    94,   163,    95,   103,   104,   121,
      53,    12,    14,   108,   108,    13,   108,    13,   108,   121,
     163,   138,    27,    97,   138,    95,    60,    61,    62,   121,
     152,   153,   163,    88,   121,   125,    55,    78,    27,    28,
      31,    58,   141,   142,   143,   162,   121,   136,   137,   121,
     121,   121,   121,   121,   121,   121,   121,   121,   121,   121,
     121,   121,   121,   121,   121,   121,   121,    12,    36,    37,
      38,    39,    40,    41,    42,    27,   124,    46,   121,   144,
      27,   161,   121,    14,    93,   139,    53,    32,   138,    53,
      10,    11,   105,   157,   157,    27,    28,    31,   160,    27,
      28,    31,   160,   138,   138,   121,   138,   121,   138,    20,
      32,    98,   138,   138,    62,   152,    17,   121,    12,    53,
     121,   129,   130,   131,   132,    55,    50,   121,    57,    53,
      50,    59,    53,    50,   121,   121,   121,   121,   121,   121,
     121,   121,   129,    59,    46,   156,   163,    94,   121,   104,
     108,   108,   121,   121,    96,   163,   121,    16,    27,   148,
     150,   152,   161,   121,   152,   153,   163,    55,    78,    53,
     121,    59,   143,   121,   121,   121,    55,     5,   145,   138,
     138,    21,    22,   115,    53,    27,    28,   161,    53,   138,
      27,   161,    17,   121,    12,   130,    50,   121,     9,   146,
     121,   163,   121,   151,   121,   150,   152,   153,   121,   121,
       6,   147,   108,   150,   148,   149,    27,   138,   121,    53,
     121,    59,   138,   138,    53,   121,   150,   121,   148,   150,
     138,   138
};

  /* YYR1[YYN] -- Symbol number of symbol that rule YYN derives.  */
static const yytype_uint8 yyr1[] =
{
       0,    72,    73,    73,    74,    74,    74,    75,    76,    75,
      77,    78,    79,    79,    79,    79,    79,    79,    80,    80,
      81,    81,    81,    81,    81,    81,    81,    81,    81,    81,
      81,    82,    82,    82,    83,    83,    83,    84,    84,    85,
      86,    87,    87,    88,    89,    91,    90,    92,    92,    92,
      92,    92,    92,    93,    93,    94,    95,    95,    95,    96,
      96,    98,    97,   100,    99,   102,   101,   103,   103,   104,
     105,   105,   105,   105,   106,   106,   107,   108,   108,   109,
     110,   111,   111,   112,   113,   113,   114,   115,   115,   117,
     116,   118,   118,   118,   120,   119,   119,   121,   121,   121,
     121,   121,   121,   122,   122,   124,   123,   125,   123,   126,
     126,   126,   127,   127,   127,   127,   127,   127,   127,   127,
     127,   127,   127,   127,   127,   127,   127,   127,   127,   127,
     127,   127,   127,   127,   127,   127,   128,   129,   129,   130,
     131,   130,   132,   132,   133,   133,   135,   134,   136,   136,
     137,   137,   138,   138,   140,   139,   141,   141,   142,   142,
     143,   143,   143,   143,   144,   144,   145,   145,   146,   146,
     146,   147,   147,   148,   148,   148,   148,   149,   149,   150,
     151,   150,   150,   150,   152,   152,   152,   153,   153,   154,
     154,   154,   154,   154,   155,   154,   154,   154,   154,   156,
     154,   157,   157,   158,   158,   159,   159,   159,   159,   159,
     160,   160,   160,   161,   162,   162,   163
};

  /* YYR2[YYN] -- Number of symbols on the right hand side of rule YYN.  */
static const yytype_uint8 yyr2[] =
{
       0,     2,     1,     1,     1,     3,     2,     0,     0,     3,
       2,     2,     1,     1,     1,     1,     1,     1,     0,     2,
       1,     1,     1,     1,     1,     1,     1,     1,     1,     1,
       1,     4,     2,     2,     6,     8,    10,     9,    11,     2,
       2,     1,     3,     3,     4,     0,     3,     3,     3,     4,
       4,     3,     4,     1,     3,     3,     0,     2,     4,     1,
       3,     0,     3,     0,     3,     0,     3,     1,     3,     2,
       0,     1,     1,     1,     2,     4,     2,     2,     2,     4,
       4,     3,     5,     2,     3,     5,     2,     1,     1,     0,
       9,     1,     1,     1,     0,     3,     1,     1,     1,     1,
       1,     1,     3,     1,     3,     0,     5,     0,     5,     2,
       2,     2,     3,     3,     3,     3,     3,     3,     3,     3,
       3,     3,     3,     3,     3,     3,     3,     3,     4,     4,
       4,     4,     4,     4,     4,     4,     5,     0,     1,     1,
       0,     2,     1,     3,     1,     1,     0,     4,     0,     1,
       1,     3,     0,     2,     0,     4,     0,     1,     1,     3,
       1,     3,     3,     5,     1,     2,     0,     2,     0,     2,
       4,     0,     2,     1,     1,     2,     2,     1,     3,     1,
       0,     4,     2,     2,     1,     1,     1,     1,     2,     1,
       1,     1,     1,     3,     0,     4,     3,     3,     4,     0,
       8,     1,     1,     1,     1,     1,     1,     1,     1,     1,
       1,     1,     1,     1,     1,     1,     1
};


#define yyerrok         (yyerrstatus = 0)
#define yyclearin       (yychar = YYEMPTY)
#define YYEMPTY         (-2)
#define YYEOF           0

#define YYACCEPT        goto yyacceptlab
#define YYABORT         goto yyabortlab
#define YYERROR         goto yyerrorlab


#define YYRECOVERING()  (!!yyerrstatus)

#define YYBACKUP(Token, Value)                                  \
do                                                              \
  if (yychar == YYEMPTY)                                        \
    {                                                           \
      yychar = (Token);                                         \
      yylval = (Value);                                         \
      YYPOPSTACK (yylen);                                       \
      yystate = *yyssp;                                         \
      goto yybackup;                                            \
    }                                                           \
  else                                                          \
    {                                                           \
      yyerror (&yylloc, parser, YY_("syntax error: cannot back up")); \
      YYERROR;                                                  \
    }                                                           \
while (0)

/* Error token number */
#define YYTERROR        1
#define YYERRCODE       256


/* YYLLOC_DEFAULT -- Set CURRENT to span from RHS[1] to RHS[N].
   If N is 0, then set CURRENT to the empty location which ends
   the previous symbol: RHS[0] (always defined).  */

#ifndef YYLLOC_DEFAULT
# define YYLLOC_DEFAULT(Current, Rhs, N)                                \
    do                                                                  \
      if (N)                                                            \
        {                                                               \
          (Current).first_line   = YYRHSLOC (Rhs, 1).first_line;        \
          (Current).first_column = YYRHSLOC (Rhs, 1).first_column;      \
          (Current).last_line    = YYRHSLOC (Rhs, N).last_line;         \
          (Current).last_column  = YYRHSLOC (Rhs, N).last_column;       \
        }                                                               \
      else                                                              \
        {                                                               \
          (Current).first_line   = (Current).last_line   =              \
            YYRHSLOC (Rhs, 0).last_line;                                \
          (Current).first_column = (Current).last_column =              \
            YYRHSLOC (Rhs, 0).last_column;                              \
        }                                                               \
    while (0)
#endif

#define YYRHSLOC(Rhs, K) ((Rhs)[K])


/* Enable debugging if requested.  */
#if YYDEBUG

# ifndef YYFPRINTF
#  include <stdio.h> /* INFRINGES ON USER NAME SPACE */
#  define YYFPRINTF fprintf
# endif

# define YYDPRINTF(Args)                        \
do {                                            \
  if (yydebug)                                  \
    YYFPRINTF Args;                             \
} while (0)


/* YY_LOCATION_PRINT -- Print the location on the stream.
   This macro was not mandated originally: define only if we know
   we won't break user code: when these are the locations we know.  */

#ifndef YY_LOCATION_PRINT
# if defined YYLTYPE_IS_TRIVIAL && YYLTYPE_IS_TRIVIAL

/* Print *YYLOCP on YYO.  Private, do not rely on its existence. */

YY_ATTRIBUTE_UNUSED
static unsigned
yy_location_print_ (FILE *yyo, YYLTYPE const * const yylocp)
{
  unsigned res = 0;
  int end_col = 0 != yylocp->last_column ? yylocp->last_column - 1 : 0;
  if (0 <= yylocp->first_line)
    {
      res += YYFPRINTF (yyo, "%d", yylocp->first_line);
      if (0 <= yylocp->first_column)
        res += YYFPRINTF (yyo, ".%d", yylocp->first_column);
    }
  if (0 <= yylocp->last_line)
    {
      if (yylocp->first_line < yylocp->last_line)
        {
          res += YYFPRINTF (yyo, "-%d", yylocp->last_line);
          if (0 <= end_col)
            res += YYFPRINTF (yyo, ".%d", end_col);
        }
      else if (0 <= end_col && yylocp->first_column < end_col)
        res += YYFPRINTF (yyo, "-%d", end_col);
    }
  return res;
 }

#  define YY_LOCATION_PRINT(File, Loc)          \
  yy_location_print_ (File, &(Loc))

# else
#  define YY_LOCATION_PRINT(File, Loc) ((void) 0)
# endif
#endif


# define YY_SYMBOL_PRINT(Title, Type, Value, Location)                    \
do {                                                                      \
  if (yydebug)                                                            \
    {                                                                     \
      YYFPRINTF (stderr, "%s ", Title);                                   \
      yy_symbol_print (stderr,                                            \
                  Type, Value, Location, parser); \
      YYFPRINTF (stderr, "\n");                                           \
    }                                                                     \
} while (0)


/*----------------------------------------.
| Print this symbol's value on YYOUTPUT.  |
`----------------------------------------*/

static void
yy_symbol_value_print (FILE *yyoutput, int yytype, YYSTYPE const * const yyvaluep, YYLTYPE const * const yylocationp, arangodb::aql::Parser* parser)
{
  FILE *yyo = yyoutput;
  YYUSE (yyo);
  YYUSE (yylocationp);
  YYUSE (parser);
  if (!yyvaluep)
    return;
# ifdef YYPRINT
  if (yytype < YYNTOKENS)
    YYPRINT (yyoutput, yytoknum[yytype], *yyvaluep);
# endif
  YYUSE (yytype);
}


/*--------------------------------.
| Print this symbol on YYOUTPUT.  |
`--------------------------------*/

static void
yy_symbol_print (FILE *yyoutput, int yytype, YYSTYPE const * const yyvaluep, YYLTYPE const * const yylocationp, arangodb::aql::Parser* parser)
{
  YYFPRINTF (yyoutput, "%s %s (",
             yytype < YYNTOKENS ? "token" : "nterm", yytname[yytype]);

  YY_LOCATION_PRINT (yyoutput, *yylocationp);
  YYFPRINTF (yyoutput, ": ");
  yy_symbol_value_print (yyoutput, yytype, yyvaluep, yylocationp, parser);
  YYFPRINTF (yyoutput, ")");
}

/*------------------------------------------------------------------.
| yy_stack_print -- Print the state stack from its BOTTOM up to its |
| TOP (included).                                                   |
`------------------------------------------------------------------*/

static void
yy_stack_print (yytype_int16 *yybottom, yytype_int16 *yytop)
{
  YYFPRINTF (stderr, "Stack now");
  for (; yybottom <= yytop; yybottom++)
    {
      int yybot = *yybottom;
      YYFPRINTF (stderr, " %d", yybot);
    }
  YYFPRINTF (stderr, "\n");
}

# define YY_STACK_PRINT(Bottom, Top)                            \
do {                                                            \
  if (yydebug)                                                  \
    yy_stack_print ((Bottom), (Top));                           \
} while (0)


/*------------------------------------------------.
| Report that the YYRULE is going to be reduced.  |
`------------------------------------------------*/

static void
yy_reduce_print (yytype_int16 *yyssp, YYSTYPE *yyvsp, YYLTYPE *yylsp, int yyrule, arangodb::aql::Parser* parser)
{
  unsigned long int yylno = yyrline[yyrule];
  int yynrhs = yyr2[yyrule];
  int yyi;
  YYFPRINTF (stderr, "Reducing stack by rule %d (line %lu):\n",
             yyrule - 1, yylno);
  /* The symbols being reduced.  */
  for (yyi = 0; yyi < yynrhs; yyi++)
    {
      YYFPRINTF (stderr, "   $%d = ", yyi + 1);
      yy_symbol_print (stderr,
                       yystos[yyssp[yyi + 1 - yynrhs]],
                       &(yyvsp[(yyi + 1) - (yynrhs)])
                       , &(yylsp[(yyi + 1) - (yynrhs)])                       , parser);
      YYFPRINTF (stderr, "\n");
    }
}

# define YY_REDUCE_PRINT(Rule)          \
do {                                    \
  if (yydebug)                          \
    yy_reduce_print (yyssp, yyvsp, yylsp, Rule, parser); \
} while (0)

/* Nonzero means print parse trace.  It is left uninitialized so that
   multiple parsers can coexist.  */
int yydebug;
#else /* !YYDEBUG */
# define YYDPRINTF(Args)
# define YY_SYMBOL_PRINT(Title, Type, Value, Location)
# define YY_STACK_PRINT(Bottom, Top)
# define YY_REDUCE_PRINT(Rule)
#endif /* !YYDEBUG */


/* YYINITDEPTH -- initial size of the parser's stacks.  */
#ifndef YYINITDEPTH
# define YYINITDEPTH 200
#endif

/* YYMAXDEPTH -- maximum size the stacks can grow to (effective only
   if the built-in stack extension method is used).

   Do not make this value too large; the results are undefined if
   YYSTACK_ALLOC_MAXIMUM < YYSTACK_BYTES (YYMAXDEPTH)
   evaluated with infinite-precision integer arithmetic.  */

#ifndef YYMAXDEPTH
# define YYMAXDEPTH 10000
#endif


#if YYERROR_VERBOSE

# ifndef yystrlen
#  if defined __GLIBC__ && defined _STRING_H
#   define yystrlen strlen
#  else
/* Return the length of YYSTR.  */
static YYSIZE_T
yystrlen (const char *yystr)
{
  YYSIZE_T yylen;
  for (yylen = 0; yystr[yylen]; yylen++)
    continue;
  return yylen;
}
#  endif
# endif

# ifndef yystpcpy
#  if defined __GLIBC__ && defined _STRING_H && defined _GNU_SOURCE
#   define yystpcpy stpcpy
#  else
/* Copy YYSRC to YYDEST, returning the address of the terminating '\0' in
   YYDEST.  */
static char *
yystpcpy (char *yydest, const char *yysrc)
{
  char *yyd = yydest;
  const char *yys = yysrc;

  while ((*yyd++ = *yys++) != '\0')
    continue;

  return yyd - 1;
}
#  endif
# endif

# ifndef yytnamerr
/* Copy to YYRES the contents of YYSTR after stripping away unnecessary
   quotes and backslashes, so that it's suitable for yyerror.  The
   heuristic is that double-quoting is unnecessary unless the string
   contains an apostrophe, a comma, or backslash (other than
   backslash-backslash).  YYSTR is taken from yytname.  If YYRES is
   null, do not copy; instead, return the length of what the result
   would have been.  */
static YYSIZE_T
yytnamerr (char *yyres, const char *yystr)
{
  if (*yystr == '"')
    {
      YYSIZE_T yyn = 0;
      char const *yyp = yystr;

      for (;;)
        switch (*++yyp)
          {
          case '\'':
          case ',':
            goto do_not_strip_quotes;

          case '\\':
            if (*++yyp != '\\')
              goto do_not_strip_quotes;
            /* Fall through.  */
          default:
            if (yyres)
              yyres[yyn] = *yyp;
            yyn++;
            break;

          case '"':
            if (yyres)
              yyres[yyn] = '\0';
            return yyn;
          }
    do_not_strip_quotes: ;
    }

  if (! yyres)
    return yystrlen (yystr);

  return yystpcpy (yyres, yystr) - yyres;
}
# endif

/* Copy into *YYMSG, which is of size *YYMSG_ALLOC, an error message
   about the unexpected token YYTOKEN for the state stack whose top is
   YYSSP.

   Return 0 if *YYMSG was successfully written.  Return 1 if *YYMSG is
   not large enough to hold the message.  In that case, also set
   *YYMSG_ALLOC to the required number of bytes.  Return 2 if the
   required number of bytes is too large to store.  */
static int
yysyntax_error (YYSIZE_T *yymsg_alloc, char **yymsg,
                yytype_int16 *yyssp, int yytoken)
{
  YYSIZE_T yysize0 = yytnamerr (YY_NULLPTR, yytname[yytoken]);
  YYSIZE_T yysize = yysize0;
  enum { YYERROR_VERBOSE_ARGS_MAXIMUM = 5 };
  /* Internationalized format string. */
  const char *yyformat = YY_NULLPTR;
  /* Arguments of yyformat. */
  char const *yyarg[YYERROR_VERBOSE_ARGS_MAXIMUM];
  /* Number of reported tokens (one for the "unexpected", one per
     "expected"). */
  int yycount = 0;

  /* There are many possibilities here to consider:
     - If this state is a consistent state with a default action, then
       the only way this function was invoked is if the default action
       is an error action.  In that case, don't check for expected
       tokens because there are none.
     - The only way there can be no lookahead present (in yychar) is if
       this state is a consistent state with a default action.  Thus,
       detecting the absence of a lookahead is sufficient to determine
       that there is no unexpected or expected token to report.  In that
       case, just report a simple "syntax error".
     - Don't assume there isn't a lookahead just because this state is a
       consistent state with a default action.  There might have been a
       previous inconsistent state, consistent state with a non-default
       action, or user semantic action that manipulated yychar.
     - Of course, the expected token list depends on states to have
       correct lookahead information, and it depends on the parser not
       to perform extra reductions after fetching a lookahead from the
       scanner and before detecting a syntax error.  Thus, state merging
       (from LALR or IELR) and default reductions corrupt the expected
       token list.  However, the list is correct for canonical LR with
       one exception: it will still contain any token that will not be
       accepted due to an error action in a later state.
  */
  if (yytoken != YYEMPTY)
    {
      int yyn = yypact[*yyssp];
      yyarg[yycount++] = yytname[yytoken];
      if (!yypact_value_is_default (yyn))
        {
          /* Start YYX at -YYN if negative to avoid negative indexes in
             YYCHECK.  In other words, skip the first -YYN actions for
             this state because they are default actions.  */
          int yyxbegin = yyn < 0 ? -yyn : 0;
          /* Stay within bounds of both yycheck and yytname.  */
          int yychecklim = YYLAST - yyn + 1;
          int yyxend = yychecklim < YYNTOKENS ? yychecklim : YYNTOKENS;
          int yyx;

          for (yyx = yyxbegin; yyx < yyxend; ++yyx)
            if (yycheck[yyx + yyn] == yyx && yyx != YYTERROR
                && !yytable_value_is_error (yytable[yyx + yyn]))
              {
                if (yycount == YYERROR_VERBOSE_ARGS_MAXIMUM)
                  {
                    yycount = 1;
                    yysize = yysize0;
                    break;
                  }
                yyarg[yycount++] = yytname[yyx];
                {
                  YYSIZE_T yysize1 = yysize + yytnamerr (YY_NULLPTR, yytname[yyx]);
                  if (! (yysize <= yysize1
                         && yysize1 <= YYSTACK_ALLOC_MAXIMUM))
                    return 2;
                  yysize = yysize1;
                }
              }
        }
    }

  switch (yycount)
    {
# define YYCASE_(N, S)                      \
      case N:                               \
        yyformat = S;                       \
      break
      YYCASE_(0, YY_("syntax error"));
      YYCASE_(1, YY_("syntax error, unexpected %s"));
      YYCASE_(2, YY_("syntax error, unexpected %s, expecting %s"));
      YYCASE_(3, YY_("syntax error, unexpected %s, expecting %s or %s"));
      YYCASE_(4, YY_("syntax error, unexpected %s, expecting %s or %s or %s"));
      YYCASE_(5, YY_("syntax error, unexpected %s, expecting %s or %s or %s or %s"));
# undef YYCASE_
    }

  {
    YYSIZE_T yysize1 = yysize + yystrlen (yyformat);
    if (! (yysize <= yysize1 && yysize1 <= YYSTACK_ALLOC_MAXIMUM))
      return 2;
    yysize = yysize1;
  }

  if (*yymsg_alloc < yysize)
    {
      *yymsg_alloc = 2 * yysize;
      if (! (yysize <= *yymsg_alloc
             && *yymsg_alloc <= YYSTACK_ALLOC_MAXIMUM))
        *yymsg_alloc = YYSTACK_ALLOC_MAXIMUM;
      return 1;
    }

  /* Avoid sprintf, as that infringes on the user's name space.
     Don't have undefined behavior even if the translation
     produced a string with the wrong number of "%s"s.  */
  {
    char *yyp = *yymsg;
    int yyi = 0;
    while ((*yyp = *yyformat) != '\0')
      if (*yyp == '%' && yyformat[1] == 's' && yyi < yycount)
        {
          yyp += yytnamerr (yyp, yyarg[yyi++]);
          yyformat += 2;
        }
      else
        {
          yyp++;
          yyformat++;
        }
  }
  return 0;
}
#endif /* YYERROR_VERBOSE */

/*-----------------------------------------------.
| Release the memory associated to this symbol.  |
`-----------------------------------------------*/

static void
yydestruct (const char *yymsg, int yytype, YYSTYPE *yyvaluep, YYLTYPE *yylocationp, arangodb::aql::Parser* parser)
{
  YYUSE (yyvaluep);
  YYUSE (yylocationp);
  YYUSE (parser);
  if (!yymsg)
    yymsg = "Deleting";
  YY_SYMBOL_PRINT (yymsg, yytype, yyvaluep, yylocationp);

  YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
  YYUSE (yytype);
  YY_IGNORE_MAYBE_UNINITIALIZED_END
}




/*----------.
| yyparse.  |
`----------*/

int
yyparse (arangodb::aql::Parser* parser)
{
/* The lookahead symbol.  */
int yychar;


/* The semantic value of the lookahead symbol.  */
/* Default value used for initialization, for pacifying older GCCs
   or non-GCC compilers.  */
YY_INITIAL_VALUE (static YYSTYPE yyval_default;)
YYSTYPE yylval YY_INITIAL_VALUE (= yyval_default);

/* Location data for the lookahead symbol.  */
static YYLTYPE yyloc_default
# if defined YYLTYPE_IS_TRIVIAL && YYLTYPE_IS_TRIVIAL
  = { 1, 1, 1, 1 }
# endif
;
YYLTYPE yylloc = yyloc_default;

    /* Number of syntax errors so far.  */
    int yynerrs;

    int yystate;
    /* Number of tokens to shift before error messages enabled.  */
    int yyerrstatus;

    /* The stacks and their tools:
       'yyss': related to states.
       'yyvs': related to semantic values.
       'yyls': related to locations.

       Refer to the stacks through separate pointers, to allow yyoverflow
       to reallocate them elsewhere.  */

    /* The state stack.  */
    yytype_int16 yyssa[YYINITDEPTH];
    yytype_int16 *yyss;
    yytype_int16 *yyssp;

    /* The semantic value stack.  */
    YYSTYPE yyvsa[YYINITDEPTH];
    YYSTYPE *yyvs;
    YYSTYPE *yyvsp;

    /* The location stack.  */
    YYLTYPE yylsa[YYINITDEPTH];
    YYLTYPE *yyls;
    YYLTYPE *yylsp;

    /* The locations where the error started and ended.  */
    YYLTYPE yyerror_range[3];

    YYSIZE_T yystacksize;

  int yyn;
  int yyresult;
  /* Lookahead token as an internal (translated) token number.  */
  int yytoken = 0;
  /* The variables used to return semantic value and location from the
     action routines.  */
  YYSTYPE yyval;
  YYLTYPE yyloc;

#if YYERROR_VERBOSE
  /* Buffer for error messages, and its allocated size.  */
  char yymsgbuf[128];
  char *yymsg = yymsgbuf;
  YYSIZE_T yymsg_alloc = sizeof yymsgbuf;
#endif

#define YYPOPSTACK(N)   (yyvsp -= (N), yyssp -= (N), yylsp -= (N))

  /* The number of symbols on the RHS of the reduced rule.
     Keep to zero when no symbol should be popped.  */
  int yylen = 0;

  yyssp = yyss = yyssa;
  yyvsp = yyvs = yyvsa;
  yylsp = yyls = yylsa;
  yystacksize = YYINITDEPTH;

  YYDPRINTF ((stderr, "Starting parse\n"));

  yystate = 0;
  yyerrstatus = 0;
  yynerrs = 0;
  yychar = YYEMPTY; /* Cause a token to be read.  */
  yylsp[0] = yylloc;
  goto yysetstate;

/*------------------------------------------------------------.
| yynewstate -- Push a new state, which is found in yystate.  |
`------------------------------------------------------------*/
 yynewstate:
  /* In all cases, when you get here, the value and location stacks
     have just been pushed.  So pushing a state here evens the stacks.  */
  yyssp++;

 yysetstate:
  *yyssp = yystate;

  if (yyss + yystacksize - 1 <= yyssp)
    {
      /* Get the current used size of the three stacks, in elements.  */
      YYSIZE_T yysize = yyssp - yyss + 1;

#ifdef yyoverflow
      {
        /* Give user a chance to reallocate the stack.  Use copies of
           these so that the &'s don't force the real ones into
           memory.  */
        YYSTYPE *yyvs1 = yyvs;
        yytype_int16 *yyss1 = yyss;
        YYLTYPE *yyls1 = yyls;

        /* Each stack pointer address is followed by the size of the
           data in use in that stack, in bytes.  This used to be a
           conditional around just the two extra args, but that might
           be undefined if yyoverflow is a macro.  */
        yyoverflow (YY_("memory exhausted"),
                    &yyss1, yysize * sizeof (*yyssp),
                    &yyvs1, yysize * sizeof (*yyvsp),
                    &yyls1, yysize * sizeof (*yylsp),
                    &yystacksize);

        yyls = yyls1;
        yyss = yyss1;
        yyvs = yyvs1;
      }
#else /* no yyoverflow */
# ifndef YYSTACK_RELOCATE
      goto yyexhaustedlab;
# else
      /* Extend the stack our own way.  */
      if (YYMAXDEPTH <= yystacksize)
        goto yyexhaustedlab;
      yystacksize *= 2;
      if (YYMAXDEPTH < yystacksize)
        yystacksize = YYMAXDEPTH;

      {
        yytype_int16 *yyss1 = yyss;
        union yyalloc *yyptr =
          (union yyalloc *) YYSTACK_ALLOC (YYSTACK_BYTES (yystacksize));
        if (! yyptr)
          goto yyexhaustedlab;
        YYSTACK_RELOCATE (yyss_alloc, yyss);
        YYSTACK_RELOCATE (yyvs_alloc, yyvs);
        YYSTACK_RELOCATE (yyls_alloc, yyls);
#  undef YYSTACK_RELOCATE
        if (yyss1 != yyssa)
          YYSTACK_FREE (yyss1);
      }
# endif
#endif /* no yyoverflow */

      yyssp = yyss + yysize - 1;
      yyvsp = yyvs + yysize - 1;
      yylsp = yyls + yysize - 1;

      YYDPRINTF ((stderr, "Stack size increased to %lu\n",
                  (unsigned long int) yystacksize));

      if (yyss + yystacksize - 1 <= yyssp)
        YYABORT;
    }

  YYDPRINTF ((stderr, "Entering state %d\n", yystate));

  if (yystate == YYFINAL)
    YYACCEPT;

  goto yybackup;

/*-----------.
| yybackup.  |
`-----------*/
yybackup:

  /* Do appropriate processing given the current state.  Read a
     lookahead token if we need one and don't already have one.  */

  /* First try to decide what to do without reference to lookahead token.  */
  yyn = yypact[yystate];
  if (yypact_value_is_default (yyn))
    goto yydefault;

  /* Not known => get a lookahead token if don't already have one.  */

  /* YYCHAR is either YYEMPTY or YYEOF or a valid lookahead symbol.  */
  if (yychar == YYEMPTY)
    {
      YYDPRINTF ((stderr, "Reading a token: "));
      yychar = yylex (&yylval, &yylloc, scanner);
    }

  if (yychar <= YYEOF)
    {
      yychar = yytoken = YYEOF;
      YYDPRINTF ((stderr, "Now at end of input.\n"));
    }
  else
    {
      yytoken = YYTRANSLATE (yychar);
      YY_SYMBOL_PRINT ("Next token is", yytoken, &yylval, &yylloc);
    }

  /* If the proper action on seeing token YYTOKEN is to reduce or to
     detect an error, take that action.  */
  yyn += yytoken;
  if (yyn < 0 || YYLAST < yyn || yycheck[yyn] != yytoken)
    goto yydefault;
  yyn = yytable[yyn];
  if (yyn <= 0)
    {
      if (yytable_value_is_error (yyn))
        goto yyerrlab;
      yyn = -yyn;
      goto yyreduce;
    }

  /* Count tokens shifted since error; after three, turn off error
     status.  */
  if (yyerrstatus)
    yyerrstatus--;

  /* Shift the lookahead token.  */
  YY_SYMBOL_PRINT ("Shifting", yytoken, &yylval, &yylloc);

  /* Discard the shifted token.  */
  yychar = YYEMPTY;

  yystate = yyn;
  YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
  *++yyvsp = yylval;
  YY_IGNORE_MAYBE_UNINITIALIZED_END
  *++yylsp = yylloc;
  goto yynewstate;


/*-----------------------------------------------------------.
| yydefault -- do the default action for the current state.  |
`-----------------------------------------------------------*/
yydefault:
  yyn = yydefact[yystate];
  if (yyn == 0)
    goto yyerrlab;
  goto yyreduce;


/*-----------------------------.
| yyreduce -- Do a reduction.  |
`-----------------------------*/
yyreduce:
  /* yyn is the number of a rule to reduce with.  */
  yylen = yyr2[yyn];

  /* If YYLEN is nonzero, implement the default value of the action:
     '$$ = $1'.

     Otherwise, the following line sets YYVAL to garbage.
     This behavior is undocumented and Bison
     users should not rely upon it.  Assigning to YYVAL
     unconditionally makes the parser a bit smaller, and it avoids a
     GCC warning that YYVAL may be used uninitialized.  */
  yyval = yyvsp[1-yylen];

  /* Default location.  */
  YYLLOC_DEFAULT (yyloc, (yylsp - yylen), yylen);
  YY_REDUCE_PRINT (yyn);
  switch (yyn)
    {
        case 2:
#line 365 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueString((yyvsp[0].strval).value, (yyvsp[0].strval).length);
    }
#line 2087 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 3:
#line 368 "Aql/grammar.y" /* yacc.c:1661  */
    {
      char const* p = (yyvsp[0].node)->getStringValue();
      size_t const len = (yyvsp[0].node)->getStringLength();
      if (len < 1 || *p != '@') {
        parser->registerParseError(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE, TRI_errno_string(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE), p, yylloc.first_line, yylloc.first_column);
      }
      (yyval.node) = (yyvsp[0].node);
    }
#line 2100 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 4:
#line 379 "Aql/grammar.y" /* yacc.c:1661  */
    {
       auto node = static_cast<AstNode*>(parser->peekStack());
       node->addMember((yyvsp[0].node));
     }
#line 2109 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 5:
#line 383 "Aql/grammar.y" /* yacc.c:1661  */
    {
       auto node = static_cast<AstNode*>(parser->peekStack());
       node->addMember((yyvsp[0].node));
     }
#line 2118 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 6:
#line 387 "Aql/grammar.y" /* yacc.c:1661  */
    {
       auto node = static_cast<AstNode*>(parser->peekStack());
       node->addMember((yyvsp[0].node));
     }
#line 2127 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 7:
#line 394 "Aql/grammar.y" /* yacc.c:1661  */
    {
     }
#line 2134 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 8:
#line 396 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
     }
#line 2143 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 9:
#line 399 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = static_cast<AstNode*>(parser->popStack());
      auto withNode = parser->ast()->createNodeWithCollections(node);
      parser->ast()->addOperation(withNode);
     }
#line 2153 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 10:
#line 407 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2160 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 11:
#line 412 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2167 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 12:
#line 417 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2174 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 13:
#line 419 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->endNested();
    }
#line 2182 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 14:
#line 422 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->endNested();
    }
#line 2190 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 15:
#line 425 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->endNested();
    }
#line 2198 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 16:
#line 428 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->endNested();
    }
#line 2206 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 17:
#line 431 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->endNested();
    }
#line 2214 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 18:
#line 437 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2221 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 19:
#line 439 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2228 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 20:
#line 444 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2235 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 21:
#line 446 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2242 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 22:
#line 448 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2249 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 23:
#line 450 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2256 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 24:
#line 452 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2263 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 25:
#line 454 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2270 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 26:
#line 456 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2277 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 27:
#line 458 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2284 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 28:
#line 460 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2291 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 29:
#line 462 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2298 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 30:
#line 464 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2305 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 31:
#line 469 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->start(arangodb::aql::AQL_SCOPE_FOR);
     
      auto node = parser->ast()->createNodeFor((yyvsp[-2].strval).value, (yyvsp[-2].strval).length, (yyvsp[0].node), true);
      parser->ast()->addOperation(node);
    }
#line 2316 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 32:
#line 475 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2323 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 33:
#line 477 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2330 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 34:
#line 482 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->start(arangodb::aql::AQL_SCOPE_FOR);
      auto node = parser->ast()->createNodeTraversal((yyvsp[-5].strval).value, (yyvsp[-5].strval).length, (yyvsp[-3].node), (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2340 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 35:
#line 487 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->start(arangodb::aql::AQL_SCOPE_FOR);
      auto node = parser->ast()->createNodeTraversal((yyvsp[-7].strval).value, (yyvsp[-7].strval).length, (yyvsp[-5].strval).value, (yyvsp[-5].strval).length, (yyvsp[-3].node), (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2350 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 36:
#line 492 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->start(arangodb::aql::AQL_SCOPE_FOR);
      auto node = parser->ast()->createNodeTraversal((yyvsp[-9].strval).value, (yyvsp[-9].strval).length, (yyvsp[-7].strval).value, (yyvsp[-7].strval).length, (yyvsp[-5].strval).value, (yyvsp[-5].strval).length, (yyvsp[-3].node), (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2360 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 37:
#line 500 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (!TRI_CaseEqualString((yyvsp[-3].strval).value, "TO")) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "unexpected qualifier '%s', expecting 'TO'", (yyvsp[-3].strval).value, yylloc.first_line, yylloc.first_column);
      }
      parser->ast()->scopes()->start(arangodb::aql::AQL_SCOPE_FOR);
      auto node = parser->ast()->createNodeShortestPath((yyvsp[-8].strval).value, (yyvsp[-8].strval).length, (yyvsp[-6].intval), (yyvsp[-4].node), (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2373 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 38:
#line 508 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (!TRI_CaseEqualString((yyvsp[-3].strval).value, "TO")) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "unexpected qualifier '%s', expecting 'TO'", (yyvsp[-3].strval).value, yylloc.first_line, yylloc.first_column);
      }
      parser->ast()->scopes()->start(arangodb::aql::AQL_SCOPE_FOR);
      auto node = parser->ast()->createNodeShortestPath((yyvsp[-10].strval).value, (yyvsp[-10].strval).length, (yyvsp[-8].strval).value, (yyvsp[-8].strval).length, (yyvsp[-6].intval), (yyvsp[-4].node), (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2386 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 39:
#line 519 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // operand is a reference. can use it directly
      auto node = parser->ast()->createNodeFilter((yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2396 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 40:
#line 527 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2403 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 41:
#line 532 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2410 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 42:
#line 534 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2417 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 43:
#line 539 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeLet((yyvsp[-2].strval).value, (yyvsp[-2].strval).length, (yyvsp[0].node), true);
      parser->ast()->addOperation(node);
    }
#line 2426 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 44:
#line 546 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! TRI_CaseEqualString((yyvsp[-2].strval).value, "COUNT")) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "unexpected qualifier '%s', expecting 'COUNT'", (yyvsp[-2].strval).value, yylloc.first_line, yylloc.first_column);
      }

      (yyval.strval) = (yyvsp[0].strval);
    }
#line 2438 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 45:
#line 556 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
    }
#line 2447 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 46:
#line 559 "Aql/grammar.y" /* yacc.c:1661  */
    { 
      auto list = static_cast<AstNode*>(parser->popStack());

      if (list == nullptr) {
        ABORT_OOM
      }
      (yyval.node) = list;
    }
#line 2460 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 47:
#line 570 "Aql/grammar.y" /* yacc.c:1661  */
    {
      /* COLLECT WITH COUNT INTO var OPTIONS ... */
      auto scopes = parser->ast()->scopes();

      StartCollectScope(scopes);

      auto node = parser->ast()->createNodeCollectCount(parser->ast()->createNodeArray(), (yyvsp[-1].strval).value, (yyvsp[-1].strval).length, (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2474 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 48:
#line 579 "Aql/grammar.y" /* yacc.c:1661  */
    {
      /* COLLECT var = expr WITH COUNT INTO var OPTIONS ... */
      auto scopes = parser->ast()->scopes();

      if (StartCollectScope(scopes)) {
        RegisterAssignVariables(scopes, (yyvsp[-2].node));
      }

      auto node = parser->ast()->createNodeCollectCount((yyvsp[-2].node), (yyvsp[-1].strval).value, (yyvsp[-1].strval).length, (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2490 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 49:
#line 590 "Aql/grammar.y" /* yacc.c:1661  */
    {
      /* AGGREGATE var = expr OPTIONS ... */
      auto scopes = parser->ast()->scopes();

      if (StartCollectScope(scopes)) {
        RegisterAssignVariables(scopes, (yyvsp[-2].node));
      }

      // validate aggregates
      if (! ValidateAggregates(parser, (yyvsp[-2].node))) {
        YYABORT;
      }

      if ((yyvsp[-1].node) != nullptr && (yyvsp[-1].node)->type == NODE_TYPE_ARRAY) {
        std::unordered_set<Variable const*> vars;
        Ast::getReferencedVariables((yyvsp[-1].node)->getMember(1), vars);

        Variable const* used = CheckIntoVariables((yyvsp[-2].node), vars);
        if (used != nullptr) {
          std::string msg("use of COLLECT variable '" + used->name + "' IN INTO expression");
          parser->registerParseError(TRI_ERROR_QUERY_PARSE, msg.c_str(), yylloc.first_line, yylloc.first_column);
        }
      }

      AstNode const* into = GetIntoVariable(parser, (yyvsp[-1].node));
      AstNode const* intoExpression = GetIntoExpression((yyvsp[-1].node));

      auto node = parser->ast()->createNodeCollect(parser->ast()->createNodeArray(), (yyvsp[-2].node), into, intoExpression, nullptr, (yyvsp[-1].node));
      parser->ast()->addOperation(node);
    }
#line 2525 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 50:
#line 620 "Aql/grammar.y" /* yacc.c:1661  */
    {
      /* COLLECT var = expr AGGREGATE var = expr OPTIONS ... */
      auto scopes = parser->ast()->scopes();

      if (StartCollectScope(scopes)) {
        RegisterAssignVariables(scopes, (yyvsp[-3].node));
        RegisterAssignVariables(scopes, (yyvsp[-2].node));
      }

      if (! ValidateAggregates(parser, (yyvsp[-2].node))) {
        YYABORT;
      }

      if ((yyvsp[-1].node) != nullptr && (yyvsp[-1].node)->type == NODE_TYPE_ARRAY) {
        std::unordered_set<Variable const*> vars;
        Ast::getReferencedVariables((yyvsp[-1].node)->getMember(1), vars);

        Variable const* used = CheckIntoVariables((yyvsp[-3].node), vars);
        if (used != nullptr) {
          std::string msg("use of COLLECT variable '" + used->name + "' IN INTO expression");
          parser->registerParseError(TRI_ERROR_QUERY_PARSE, msg.c_str(), yylloc.first_line, yylloc.first_column);
        }
        used = CheckIntoVariables((yyvsp[-2].node), vars);
        if (used != nullptr) {
          std::string msg("use of COLLECT variable '" + used->name + "' IN INTO expression");
          parser->registerParseError(TRI_ERROR_QUERY_PARSE, msg.c_str(), yylloc.first_line, yylloc.first_column);
        }
      }

      // note all group variables
      std::unordered_set<Variable const*> groupVars;
      size_t n = (yyvsp[-3].node)->numMembers();
      for (size_t i = 0; i < n; ++i) {
        auto member = (yyvsp[-3].node)->getMember(i);

        if (member != nullptr) {
          TRI_ASSERT(member->type == NODE_TYPE_ASSIGN);
          groupVars.emplace(static_cast<Variable const*>(member->getMember(0)->getData()));
        }
      }

      // now validate if any aggregate refers to one of the group variables
      n = (yyvsp[-2].node)->numMembers();
      for (size_t i = 0; i < n; ++i) {
        auto member = (yyvsp[-2].node)->getMember(i);

        if (member != nullptr) {
          TRI_ASSERT(member->type == NODE_TYPE_ASSIGN);
          std::unordered_set<Variable const*> variablesUsed;
          Ast::getReferencedVariables(member->getMember(1), variablesUsed);

          for (auto& it : groupVars) {
            if (variablesUsed.find(it) != variablesUsed.end()) {
              parser->registerParseError(TRI_ERROR_QUERY_VARIABLE_NAME_UNKNOWN, 
                "use of unknown variable '%s' in aggregate expression", it->name.c_str(), yylloc.first_line, yylloc.first_column);
              break;
            }
          }
        }
      }

      AstNode const* into = GetIntoVariable(parser, (yyvsp[-1].node));
      AstNode const* intoExpression = GetIntoExpression((yyvsp[-1].node));

      auto node = parser->ast()->createNodeCollect((yyvsp[-3].node), (yyvsp[-2].node), into, intoExpression, nullptr, (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2597 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 51:
#line 687 "Aql/grammar.y" /* yacc.c:1661  */
    {
      /* COLLECT var = expr INTO var OPTIONS ... */
      auto scopes = parser->ast()->scopes();

      if (StartCollectScope(scopes)) {
        RegisterAssignVariables(scopes, (yyvsp[-2].node));
      }

      if ((yyvsp[-1].node) != nullptr && (yyvsp[-1].node)->type == NODE_TYPE_ARRAY) {
        std::unordered_set<Variable const*> vars;
        Ast::getReferencedVariables((yyvsp[-1].node)->getMember(1), vars);

        Variable const* used = CheckIntoVariables((yyvsp[-2].node), vars);
        if (used != nullptr) {
          std::string msg("use of COLLECT variable '" + used->name + "' IN INTO expression");
          parser->registerParseError(TRI_ERROR_QUERY_PARSE, msg.c_str(), yylloc.first_line, yylloc.first_column);
        }
      }

      AstNode const* into = GetIntoVariable(parser, (yyvsp[-1].node));
      AstNode const* intoExpression = GetIntoExpression((yyvsp[-1].node));

      auto node = parser->ast()->createNodeCollect((yyvsp[-2].node), parser->ast()->createNodeArray(), into, intoExpression, nullptr, (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2627 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 52:
#line 712 "Aql/grammar.y" /* yacc.c:1661  */
    {
      /* COLLECT var = expr INTO var KEEP ... OPTIONS ... */
      auto scopes = parser->ast()->scopes();

      if (StartCollectScope(scopes)) {
        RegisterAssignVariables(scopes, (yyvsp[-3].node));
      }

      if ((yyvsp[-2].node) == nullptr && 
          (yyvsp[-1].node) != nullptr) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "use of 'KEEP' without 'INTO'", yylloc.first_line, yylloc.first_column);
      }

      if ((yyvsp[-2].node) != nullptr && (yyvsp[-2].node)->type == NODE_TYPE_ARRAY) {
        std::unordered_set<Variable const*> vars;
        Ast::getReferencedVariables((yyvsp[-2].node)->getMember(1), vars);

        Variable const* used = CheckIntoVariables((yyvsp[-3].node), vars);
        if (used != nullptr) {
          std::string msg("use of COLLECT variable '" + used->name + "' IN INTO expression");
          parser->registerParseError(TRI_ERROR_QUERY_PARSE, msg.c_str(), yylloc.first_line, yylloc.first_column);
        }
      }
 
      AstNode const* into = GetIntoVariable(parser, (yyvsp[-2].node));
      AstNode const* intoExpression = GetIntoExpression((yyvsp[-2].node));

      auto node = parser->ast()->createNodeCollect((yyvsp[-3].node), parser->ast()->createNodeArray(), into, intoExpression, (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2662 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 53:
#line 745 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2669 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 54:
#line 747 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2676 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 55:
#line 752 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeAssign((yyvsp[-2].strval).value, (yyvsp[-2].strval).length, (yyvsp[0].node));
      parser->pushArrayElement(node);
    }
#line 2685 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 56:
#line 759 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = nullptr;
    }
#line 2693 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 57:
#line 762 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueString((yyvsp[0].strval).value, (yyvsp[0].strval).length);
    }
#line 2701 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 58:
#line 765 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeArray();
      node->addMember(parser->ast()->createNodeValueString((yyvsp[-2].strval).value, (yyvsp[-2].strval).length));
      node->addMember((yyvsp[0].node));
      (yyval.node) = node;
    }
#line 2712 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 59:
#line 774 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->ast()->scopes()->existsVariable((yyvsp[0].strval).value, (yyvsp[0].strval).length)) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "use of unknown variable '%s' for KEEP", (yyvsp[0].strval).value, yylloc.first_line, yylloc.first_column);
      }
        
      auto node = parser->ast()->createNodeReference((yyvsp[0].strval).value, (yyvsp[0].strval).length);
      if (node == nullptr) {
        ABORT_OOM
      }

      // indicate the this node is a reference to the variable name, not the variable value
      node->setFlag(FLAG_KEEP_VARIABLENAME);
      parser->pushArrayElement(node);
    }
#line 2731 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 60:
#line 788 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->ast()->scopes()->existsVariable((yyvsp[0].strval).value, (yyvsp[0].strval).length)) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "use of unknown variable '%s' for KEEP", (yyvsp[0].strval).value, yylloc.first_line, yylloc.first_column);
      }
        
      auto node = parser->ast()->createNodeReference((yyvsp[0].strval).value, (yyvsp[0].strval).length);
      if (node == nullptr) {
        ABORT_OOM
      }

      // indicate the this node is a reference to the variable name, not the variable value
      node->setFlag(FLAG_KEEP_VARIABLENAME);
      parser->pushArrayElement(node);
    }
#line 2750 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 61:
#line 805 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! TRI_CaseEqualString((yyvsp[0].strval).value, "KEEP")) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "unexpected qualifier '%s', expecting 'KEEP'", (yyvsp[0].strval).value, yylloc.first_line, yylloc.first_column);
      }

      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
    }
#line 2763 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 62:
#line 812 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto list = static_cast<AstNode*>(parser->popStack());
      (yyval.node) = list;
    }
#line 2772 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 63:
#line 819 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
    }
#line 2781 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 64:
#line 822 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto list = static_cast<AstNode*>(parser->popStack());
      (yyval.node) = list;
    }
#line 2790 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 65:
#line 829 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
    }
#line 2799 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 66:
#line 832 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto list = static_cast<AstNode const*>(parser->popStack());
      auto node = parser->ast()->createNodeSort(list);
      parser->ast()->addOperation(node);
    }
#line 2809 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 67:
#line 840 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->pushArrayElement((yyvsp[0].node));
    }
#line 2817 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 68:
#line 843 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->pushArrayElement((yyvsp[0].node));
    }
#line 2825 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 69:
#line 849 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeSortElement((yyvsp[-1].node), (yyvsp[0].node));
    }
#line 2833 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 70:
#line 855 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueBool(true);
    }
#line 2841 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 71:
#line 858 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueBool(true);
    }
#line 2849 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 72:
#line 861 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueBool(false);
    }
#line 2857 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 73:
#line 864 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 2865 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 74:
#line 870 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto offset = parser->ast()->createNodeValueInt(0);
      auto node = parser->ast()->createNodeLimit(offset, (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2875 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 75:
#line 875 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeLimit((yyvsp[-2].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2884 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 76:
#line 882 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeReturn((yyvsp[0].node));
      parser->ast()->addOperation(node);
      parser->ast()->scopes()->endNested();
    }
#line 2894 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 77:
#line 890 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 2902 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 78:
#line 893 "Aql/grammar.y" /* yacc.c:1661  */
    {
       (yyval.node) = (yyvsp[0].node);
     }
#line 2910 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 79:
#line 899 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->configureWriteQuery((yyvsp[-1].node), (yyvsp[0].node))) {
        YYABORT;
      }
      auto node = parser->ast()->createNodeRemove((yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2922 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 80:
#line 909 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->configureWriteQuery((yyvsp[-1].node), (yyvsp[0].node))) {
        YYABORT;
      }
      auto node = parser->ast()->createNodeInsert((yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2934 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 81:
#line 919 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->configureWriteQuery((yyvsp[-1].node), (yyvsp[0].node))) {
        YYABORT;
      }

      AstNode* node = parser->ast()->createNodeUpdate(nullptr, (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2947 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 82:
#line 927 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->configureWriteQuery((yyvsp[-1].node), (yyvsp[0].node))) {
        YYABORT;
      }

      AstNode* node = parser->ast()->createNodeUpdate((yyvsp[-4].node), (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2960 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 83:
#line 938 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 2967 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 84:
#line 943 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->configureWriteQuery((yyvsp[-1].node), (yyvsp[0].node))) {
        YYABORT;
      }

      AstNode* node = parser->ast()->createNodeReplace(nullptr, (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2980 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 85:
#line 951 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->configureWriteQuery((yyvsp[-1].node), (yyvsp[0].node))) {
        YYABORT;
      }

      AstNode* node = parser->ast()->createNodeReplace((yyvsp[-4].node), (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 2993 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 86:
#line 962 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3000 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 87:
#line 967 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.intval) = static_cast<int64_t>(NODE_TYPE_UPDATE);
    }
#line 3008 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 88:
#line 970 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.intval) = static_cast<int64_t>(NODE_TYPE_REPLACE);
    }
#line 3016 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 89:
#line 976 "Aql/grammar.y" /* yacc.c:1661  */
    { 
      // reserve a variable named "$OLD", we might need it in the update expression
      // and in a later return thing
      parser->pushStack(parser->ast()->createNodeVariable(TRI_CHAR_LENGTH_PAIR(Variable::NAME_OLD), true));
    }
#line 3026 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 90:
#line 980 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if (! parser->configureWriteQuery((yyvsp[-1].node), (yyvsp[0].node))) {
        YYABORT;
      }

      AstNode* variableNode = static_cast<AstNode*>(parser->popStack());
      
      auto scopes = parser->ast()->scopes();
      
      scopes->start(arangodb::aql::AQL_SCOPE_SUBQUERY);
      parser->ast()->startSubQuery();
      
      scopes->start(arangodb::aql::AQL_SCOPE_FOR);
      std::string const variableName = parser->ast()->variables()->nextName();
      auto forNode = parser->ast()->createNodeFor(variableName.c_str(), variableName.size(), (yyvsp[-1].node), false);
      parser->ast()->addOperation(forNode);

      auto filterNode = parser->ast()->createNodeUpsertFilter(parser->ast()->createNodeReference(variableName), (yyvsp[-6].node));
      parser->ast()->addOperation(filterNode);
      
      auto offsetValue = parser->ast()->createNodeValueInt(0);
      auto limitValue = parser->ast()->createNodeValueInt(1);
      auto limitNode = parser->ast()->createNodeLimit(offsetValue, limitValue);
      parser->ast()->addOperation(limitNode);
      
      auto refNode = parser->ast()->createNodeReference(variableName);
      auto returnNode = parser->ast()->createNodeReturn(refNode);
      parser->ast()->addOperation(returnNode);
      scopes->endNested();

      AstNode* subqueryNode = parser->ast()->endSubQuery();
      scopes->endCurrent();
      
      std::string const subqueryName = parser->ast()->variables()->nextName();
      auto subQuery = parser->ast()->createNodeLet(subqueryName.c_str(), subqueryName.size(), subqueryNode, false);
      parser->ast()->addOperation(subQuery);
      
      auto index = parser->ast()->createNodeValueInt(0);
      auto firstDoc = parser->ast()->createNodeLet(variableNode, parser->ast()->createNodeIndexedAccess(parser->ast()->createNodeReference(subqueryName), index));
      parser->ast()->addOperation(firstDoc);

      auto node = parser->ast()->createNodeUpsert(static_cast<AstNodeType>((yyvsp[-3].intval)), parser->ast()->createNodeReference(TRI_CHAR_LENGTH_PAIR(Variable::NAME_OLD)), (yyvsp[-4].node), (yyvsp[-2].node), (yyvsp[-1].node), (yyvsp[0].node));
      parser->ast()->addOperation(node);
    }
#line 3075 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 91:
#line 1027 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeQuantifier(Quantifier::ALL);
    }
#line 3083 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 92:
#line 1030 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeQuantifier(Quantifier::ANY);
    }
#line 3091 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 93:
#line 1033 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeQuantifier(Quantifier::NONE);
    }
#line 3099 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 94:
#line 1039 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto const scopeType = parser->ast()->scopes()->type();

      if (scopeType == AQL_SCOPE_MAIN ||
          scopeType == AQL_SCOPE_SUBQUERY) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "cannot use DISTINCT modifier on top-level query element", yylloc.first_line, yylloc.first_column);
      }
    }
#line 3112 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 95:
#line 1046 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeDistinct((yyvsp[0].node));
    }
#line 3120 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 96:
#line 1049 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3128 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 97:
#line 1055 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3136 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 98:
#line 1058 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3144 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 99:
#line 1061 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3152 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 100:
#line 1064 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3160 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 101:
#line 1067 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3168 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 102:
#line 1070 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeRange((yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3176 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 103:
#line 1076 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.strval) = (yyvsp[0].strval);
    }
#line 3184 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 104:
#line 1079 "Aql/grammar.y" /* yacc.c:1661  */
    {
      std::string temp((yyvsp[-2].strval).value, (yyvsp[-2].strval).length);
      temp.append("::");
      temp.append((yyvsp[0].strval).value, (yyvsp[0].strval).length);
      auto p = parser->query()->registerString(temp);

      if (p == nullptr) {
        ABORT_OOM
      }

      (yyval.strval).value = p;
      (yyval.strval).length = temp.size();
    }
#line 3202 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 105:
#line 1095 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->pushStack((yyvsp[-1].strval).value);

      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
    }
#line 3213 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 106:
#line 1100 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto list = static_cast<AstNode const*>(parser->popStack());
      (yyval.node) = parser->ast()->createNodeFunctionCall(static_cast<char const*>(parser->popStack()), list);
    }
#line 3222 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 107:
#line 1104 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
    }
#line 3231 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 108:
#line 1107 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto list = static_cast<AstNode const*>(parser->popStack());
      (yyval.node) = parser->ast()->createNodeFunctionCall("LIKE", list);
    }
#line 3240 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 109:
#line 1114 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeUnaryOperator(NODE_TYPE_OPERATOR_UNARY_PLUS, (yyvsp[0].node));
    }
#line 3248 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 110:
#line 1117 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeUnaryOperator(NODE_TYPE_OPERATOR_UNARY_MINUS, (yyvsp[0].node));
    }
#line 3256 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 111:
#line 1120 "Aql/grammar.y" /* yacc.c:1661  */
    { 
      (yyval.node) = parser->ast()->createNodeUnaryOperator(NODE_TYPE_OPERATOR_UNARY_NOT, (yyvsp[0].node));
    }
#line 3264 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 112:
#line 1126 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_OR, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3272 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 113:
#line 1129 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_AND, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3280 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 114:
#line 1132 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_PLUS, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3288 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 115:
#line 1135 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_MINUS, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3296 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 116:
#line 1138 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_TIMES, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3304 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 117:
#line 1141 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_DIV, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3312 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 118:
#line 1144 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_MOD, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3320 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 119:
#line 1147 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_EQ, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3328 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 120:
#line 1150 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_NE, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3336 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 121:
#line 1153 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_LT, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3344 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 122:
#line 1156 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_GT, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3352 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 123:
#line 1159 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_LE, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3360 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 124:
#line 1162 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_GE, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3368 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 125:
#line 1165 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_IN, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3376 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 126:
#line 1168 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryOperator(NODE_TYPE_OPERATOR_BINARY_NIN, (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3384 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 127:
#line 1171 "Aql/grammar.y" /* yacc.c:1661  */
    {
      AstNode* arguments = parser->ast()->createNodeArray(2);
      arguments->addMember((yyvsp[-2].node));
      arguments->addMember((yyvsp[0].node));
      (yyval.node) = parser->ast()->createNodeFunctionCall("LIKE", arguments);
    }
#line 3395 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 128:
#line 1177 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryArrayOperator(NODE_TYPE_OPERATOR_BINARY_ARRAY_EQ, (yyvsp[-3].node), (yyvsp[0].node), (yyvsp[-2].node));
    }
#line 3403 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 129:
#line 1180 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryArrayOperator(NODE_TYPE_OPERATOR_BINARY_ARRAY_NE, (yyvsp[-3].node), (yyvsp[0].node), (yyvsp[-2].node));
    }
#line 3411 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 130:
#line 1183 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryArrayOperator(NODE_TYPE_OPERATOR_BINARY_ARRAY_LT, (yyvsp[-3].node), (yyvsp[0].node), (yyvsp[-2].node));
    }
#line 3419 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 131:
#line 1186 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryArrayOperator(NODE_TYPE_OPERATOR_BINARY_ARRAY_GT, (yyvsp[-3].node), (yyvsp[0].node), (yyvsp[-2].node));
    }
#line 3427 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 132:
#line 1189 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryArrayOperator(NODE_TYPE_OPERATOR_BINARY_ARRAY_LE, (yyvsp[-3].node), (yyvsp[0].node), (yyvsp[-2].node));
    }
#line 3435 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 133:
#line 1192 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryArrayOperator(NODE_TYPE_OPERATOR_BINARY_ARRAY_GE, (yyvsp[-3].node), (yyvsp[0].node), (yyvsp[-2].node));
    }
#line 3443 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 134:
#line 1195 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryArrayOperator(NODE_TYPE_OPERATOR_BINARY_ARRAY_IN, (yyvsp[-3].node), (yyvsp[0].node), (yyvsp[-2].node));
    }
#line 3451 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 135:
#line 1198 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeBinaryArrayOperator(NODE_TYPE_OPERATOR_BINARY_ARRAY_NIN, (yyvsp[-3].node), (yyvsp[0].node), (yyvsp[-2].node));
    }
#line 3459 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 136:
#line 1204 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeTernaryOperator((yyvsp[-4].node), (yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3467 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 137:
#line 1210 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3474 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 138:
#line 1212 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3481 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 139:
#line 1217 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3489 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 140:
#line 1220 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->start(arangodb::aql::AQL_SCOPE_SUBQUERY);
      parser->ast()->startSubQuery();
    }
#line 3498 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 141:
#line 1223 "Aql/grammar.y" /* yacc.c:1661  */
    {
      AstNode* node = parser->ast()->endSubQuery();
      parser->ast()->scopes()->endCurrent();

      std::string const variableName = parser->ast()->variables()->nextName();
      auto subQuery = parser->ast()->createNodeLet(variableName.c_str(), variableName.size(), node, false);
      parser->ast()->addOperation(subQuery);

      (yyval.node) = parser->ast()->createNodeReference(variableName);
    }
#line 3513 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 142:
#line 1236 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->pushArrayElement((yyvsp[0].node));
    }
#line 3521 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 143:
#line 1239 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->pushArrayElement((yyvsp[0].node));
    }
#line 3529 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 144:
#line 1245 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3537 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 145:
#line 1248 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3545 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 146:
#line 1254 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
    }
#line 3554 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 147:
#line 1257 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = static_cast<AstNode*>(parser->popStack());
    }
#line 3562 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 148:
#line 1263 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3569 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 149:
#line 1265 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3576 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 150:
#line 1270 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->pushArrayElement((yyvsp[0].node));
    }
#line 3584 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 151:
#line 1273 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->pushArrayElement((yyvsp[0].node));
    }
#line 3592 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 152:
#line 1279 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = nullptr;
    }
#line 3600 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 153:
#line 1282 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if ((yyvsp[0].node) == nullptr) {
        ABORT_OOM
      }

      if (! TRI_CaseEqualString((yyvsp[-1].strval).value, "OPTIONS")) {
        parser->registerParseError(TRI_ERROR_QUERY_PARSE, "unexpected qualifier '%s', expecting 'OPTIONS'", (yyvsp[-1].strval).value, yylloc.first_line, yylloc.first_column);
      }

      (yyval.node) = (yyvsp[0].node);
    }
#line 3616 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 154:
#line 1296 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeObject();
      parser->pushStack(node);
    }
#line 3625 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 155:
#line 1299 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = static_cast<AstNode*>(parser->popStack());
    }
#line 3633 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 156:
#line 1305 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3640 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 157:
#line 1307 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3647 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 158:
#line 1312 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3654 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 159:
#line 1314 "Aql/grammar.y" /* yacc.c:1661  */
    {
    }
#line 3661 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 160:
#line 1319 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // attribute-name-only (comparable to JS enhanced object literals, e.g. { foo, bar })
      auto ast = parser->ast();
      auto variable = ast->scopes()->getVariable((yyvsp[0].strval).value, (yyvsp[0].strval).length, true);
      
      if (variable == nullptr) {
        // variable does not exist
        parser->registerParseError(TRI_ERROR_QUERY_VARIABLE_NAME_UNKNOWN, "use of unknown variable '%s' in object literal", (yyvsp[0].strval).value, yylloc.first_line, yylloc.first_column);
      }

      // create a reference to the variable
      auto node = ast->createNodeReference(variable);
      parser->pushObjectElement((yyvsp[0].strval).value, (yyvsp[0].strval).length, node);
    }
#line 3680 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 161:
#line 1333 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // attribute-name : attribute-value
      parser->pushObjectElement((yyvsp[-2].strval).value, (yyvsp[-2].strval).length, (yyvsp[0].node));
    }
#line 3689 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 162:
#line 1337 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // bind-parameter : attribute-value
      if ((yyvsp[-2].strval).length < 1 || (yyvsp[-2].strval).value[0] == '@') {
        parser->registerParseError(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE, TRI_errno_string(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE), (yyvsp[-2].strval).value, yylloc.first_line, yylloc.first_column);
      }

      auto param = parser->ast()->createNodeParameter((yyvsp[-2].strval).value, (yyvsp[-2].strval).length);
      parser->pushObjectElement(param, (yyvsp[0].node));
    }
#line 3703 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 163:
#line 1346 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // [ attribute-name-expression ] : attribute-value
      parser->pushObjectElement((yyvsp[-3].node), (yyvsp[0].node));
    }
#line 3712 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 164:
#line 1353 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.intval) = 1;
    }
#line 3720 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 165:
#line 1356 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.intval) = (yyvsp[-1].intval) + 1;
    }
#line 3728 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 166:
#line 1362 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = nullptr;
    }
#line 3736 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 167:
#line 1365 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3744 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 168:
#line 1371 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = nullptr;
    }
#line 3752 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 169:
#line 1374 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeArrayLimit(nullptr, (yyvsp[0].node));
    }
#line 3760 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 170:
#line 1377 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeArrayLimit((yyvsp[-2].node), (yyvsp[0].node));
    }
#line 3768 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 171:
#line 1383 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = nullptr;
    }
#line 3776 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 172:
#line 1386 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3784 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 173:
#line 1392 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueString((yyvsp[0].strval).value, (yyvsp[0].strval).length);
    }
#line 3792 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 174:
#line 1395 "Aql/grammar.y" /* yacc.c:1661  */
    {
      char const* p = (yyvsp[0].node)->getStringValue();
      size_t const len = (yyvsp[0].node)->getStringLength();
      if (len < 1 || *p != '@') {
        parser->registerParseError(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE, TRI_errno_string(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE), p, yylloc.first_line, yylloc.first_column);
      }
      (yyval.node) = (yyvsp[0].node);
    }
#line 3805 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 175:
#line 1403 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto tmp = parser->ast()->createNodeValueString((yyvsp[0].strval).value, (yyvsp[0].strval).length);
      (yyval.node) = parser->ast()->createNodeCollectionDirection((yyvsp[-1].intval), tmp);
    }
#line 3814 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 176:
#line 1407 "Aql/grammar.y" /* yacc.c:1661  */
    {
      char const* p = (yyvsp[0].node)->getStringValue();
      size_t const len = (yyvsp[0].node)->getStringLength();
      if (len < 1 || *p != '@') {
        parser->registerParseError(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE, TRI_errno_string(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE), p, yylloc.first_line, yylloc.first_column);
      }
      (yyval.node) = parser->ast()->createNodeCollectionDirection((yyvsp[-1].intval), (yyvsp[0].node));
    }
#line 3827 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 177:
#line 1418 "Aql/grammar.y" /* yacc.c:1661  */
    {
       auto node = static_cast<AstNode*>(parser->peekStack());
       node->addMember((yyvsp[0].node));
     }
#line 3836 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 178:
#line 1422 "Aql/grammar.y" /* yacc.c:1661  */
    {
       auto node = static_cast<AstNode*>(parser->peekStack());
       node->addMember((yyvsp[0].node));
     }
#line 3845 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 179:
#line 1429 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = parser->ast()->createNodeArray();
      node->addMember((yyvsp[0].node));
      (yyval.node) = parser->ast()->createNodeCollectionList(node);
    }
#line 3855 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 180:
#line 1434 "Aql/grammar.y" /* yacc.c:1661  */
    { 
      auto node = parser->ast()->createNodeArray();
      parser->pushStack(node);
      node->addMember((yyvsp[-1].node));
    }
#line 3865 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 181:
#line 1438 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto node = static_cast<AstNode*>(parser->popStack());
      (yyval.node) = parser->ast()->createNodeCollectionList(node);
    }
#line 3874 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 182:
#line 1442 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // graph name
      char const* p = (yyvsp[0].node)->getStringValue();
      size_t const len = (yyvsp[0].node)->getStringLength();
      if (len < 1 || *p == '@') {
        parser->registerParseError(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE, TRI_errno_string(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE), p, yylloc.first_line, yylloc.first_column);
      }
      (yyval.node) = (yyvsp[0].node);
    }
#line 3888 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 183:
#line 1451 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // graph name
      (yyval.node) = parser->ast()->createNodeValueString((yyvsp[0].strval).value, (yyvsp[0].strval).length);
    }
#line 3897 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 184:
#line 1460 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.intval) = 2;
    }
#line 3905 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 185:
#line 1463 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.intval) = 1;
    }
#line 3913 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 186:
#line 1466 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.intval) = 0; 
    }
#line 3921 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 187:
#line 1472 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeDirection((yyvsp[0].intval), 1);
    }
#line 3929 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 188:
#line 1475 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeDirection((yyvsp[0].intval), (yyvsp[-1].node));
    }
#line 3937 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 189:
#line 1481 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // variable or collection
      auto ast = parser->ast();
      AstNode* node = nullptr;

      auto variable = ast->scopes()->getVariable((yyvsp[0].strval).value, (yyvsp[0].strval).length, true);
      
      if (variable == nullptr) {
        // variable does not exist
        // now try special variables
        if (ast->scopes()->canUseCurrentVariable() && strcmp((yyvsp[0].strval).value, "CURRENT") == 0) {
          variable = ast->scopes()->getCurrentVariable();
        }
        else if (strcmp((yyvsp[0].strval).value, Variable::NAME_CURRENT) == 0) {
          variable = ast->scopes()->getCurrentVariable();
        }
      }
        
      if (variable != nullptr) {
        // variable alias exists, now use it
        node = ast->createNodeReference(variable);
      }

      if (node == nullptr) {
        // variable not found. so it must have been a collection
        node = ast->createNodeCollection((yyvsp[0].strval).value, TRI_TRANSACTION_READ);
      }

      TRI_ASSERT(node != nullptr);

      (yyval.node) = node;
    }
#line 3974 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 190:
#line 1513 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3982 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 191:
#line 1516 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 3990 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 192:
#line 1519 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
      
      if ((yyval.node) == nullptr) {
        ABORT_OOM
      }
    }
#line 4002 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 193:
#line 1526 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if ((yyvsp[-1].node)->type == NODE_TYPE_EXPANSION) {
        // create a dummy passthru node that reduces and evaluates the expansion first
        // and the expansion on top of the stack won't be chained with any other expansions
        (yyval.node) = parser->ast()->createNodePassthru((yyvsp[-1].node));
      }
      else {
        (yyval.node) = (yyvsp[-1].node);
      }
    }
#line 4017 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 194:
#line 1536 "Aql/grammar.y" /* yacc.c:1661  */
    {
      parser->ast()->scopes()->start(arangodb::aql::AQL_SCOPE_SUBQUERY);
      parser->ast()->startSubQuery();
    }
#line 4026 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 195:
#line 1539 "Aql/grammar.y" /* yacc.c:1661  */
    {
      AstNode* node = parser->ast()->endSubQuery();
      parser->ast()->scopes()->endCurrent();

      std::string const variableName = parser->ast()->variables()->nextName();
      auto subQuery = parser->ast()->createNodeLet(variableName.c_str(), variableName.size(), node, false);
      parser->ast()->addOperation(subQuery);

      (yyval.node) = parser->ast()->createNodeReference(variableName);
    }
#line 4041 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 196:
#line 1549 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // named variable access, e.g. variable.reference
      if ((yyvsp[-2].node)->type == NODE_TYPE_EXPANSION) {
        // if left operand is an expansion already...
        // dive into the expansion's right-hand child nodes for further expansion and
        // patch the bottom-most one
        auto current = const_cast<AstNode*>(parser->ast()->findExpansionSubNode((yyvsp[-2].node)));
        TRI_ASSERT(current->type == NODE_TYPE_EXPANSION);
        current->changeMember(1, parser->ast()->createNodeAttributeAccess(current->getMember(1), (yyvsp[0].strval).value, (yyvsp[0].strval).length));
        (yyval.node) = (yyvsp[-2].node);
      }
      else {
        (yyval.node) = parser->ast()->createNodeAttributeAccess((yyvsp[-2].node), (yyvsp[0].strval).value, (yyvsp[0].strval).length);
      }
    }
#line 4061 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 197:
#line 1564 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // named variable access, e.g. variable.@reference
      if ((yyvsp[-2].node)->type == NODE_TYPE_EXPANSION) {
        // if left operand is an expansion already...
        // patch the existing expansion
        auto current = const_cast<AstNode*>(parser->ast()->findExpansionSubNode((yyvsp[-2].node)));
        TRI_ASSERT(current->type == NODE_TYPE_EXPANSION);
        current->changeMember(1, parser->ast()->createNodeBoundAttributeAccess(current->getMember(1), (yyvsp[0].node)));
        (yyval.node) = (yyvsp[-2].node);
      }
      else {
        (yyval.node) = parser->ast()->createNodeBoundAttributeAccess((yyvsp[-2].node), (yyvsp[0].node));
      }
    }
#line 4080 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 198:
#line 1578 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // indexed variable access, e.g. variable[index]
      if ((yyvsp[-3].node)->type == NODE_TYPE_EXPANSION) {
        // if left operand is an expansion already...
        // patch the existing expansion
        auto current = const_cast<AstNode*>(parser->ast()->findExpansionSubNode((yyvsp[-3].node)));
        TRI_ASSERT(current->type == NODE_TYPE_EXPANSION);
        current->changeMember(1, parser->ast()->createNodeIndexedAccess(current->getMember(1), (yyvsp[-1].node)));
        (yyval.node) = (yyvsp[-3].node);
      }
      else {
        (yyval.node) = parser->ast()->createNodeIndexedAccess((yyvsp[-3].node), (yyvsp[-1].node));
      }
    }
#line 4099 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 199:
#line 1592 "Aql/grammar.y" /* yacc.c:1661  */
    {
      // variable expansion, e.g. variable[*], with optional FILTER, LIMIT and RETURN clauses
      if ((yyvsp[0].intval) > 1 && (yyvsp[-2].node)->type == NODE_TYPE_EXPANSION) {
        // create a dummy passthru node that reduces and evaluates the expansion first
        // and the expansion on top of the stack won't be chained with any other expansions
        (yyvsp[-2].node) = parser->ast()->createNodePassthru((yyvsp[-2].node));
      }

      // create a temporary iterator variable
      std::string const nextName = parser->ast()->variables()->nextName() + "_";

      if ((yyvsp[-2].node)->type == NODE_TYPE_EXPANSION) {
        auto iterator = parser->ast()->createNodeIterator(nextName.c_str(), nextName.size(), (yyvsp[-2].node)->getMember(1));
        parser->pushStack(iterator);
      }
      else {
        auto iterator = parser->ast()->createNodeIterator(nextName.c_str(), nextName.size(), (yyvsp[-2].node));
        parser->pushStack(iterator);
      }

      auto scopes = parser->ast()->scopes();
      scopes->stackCurrentVariable(scopes->getVariable(nextName));
    }
#line 4127 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 200:
#line 1614 "Aql/grammar.y" /* yacc.c:1661  */
    {
      auto scopes = parser->ast()->scopes();
      scopes->unstackCurrentVariable();

      auto iterator = static_cast<AstNode const*>(parser->popStack());
      auto variableNode = iterator->getMember(0);
      TRI_ASSERT(variableNode->type == NODE_TYPE_VARIABLE);
      auto variable = static_cast<Variable const*>(variableNode->getData());

      if ((yyvsp[-7].node)->type == NODE_TYPE_EXPANSION) {
        auto expand = parser->ast()->createNodeExpansion((yyvsp[-5].intval), iterator, parser->ast()->createNodeReference(variable->name), (yyvsp[-3].node), (yyvsp[-2].node), (yyvsp[-1].node));
        (yyvsp[-7].node)->changeMember(1, expand);
        (yyval.node) = (yyvsp[-7].node);
      }
      else {
        (yyval.node) = parser->ast()->createNodeExpansion((yyvsp[-5].intval), iterator, parser->ast()->createNodeReference(variable->name), (yyvsp[-3].node), (yyvsp[-2].node), (yyvsp[-1].node));
      }
    }
#line 4150 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 201:
#line 1635 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 4158 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 202:
#line 1638 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 4166 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 203:
#line 1644 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if ((yyvsp[0].node) == nullptr) {
        ABORT_OOM
      }
      
      (yyval.node) = (yyvsp[0].node);
    }
#line 4178 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 204:
#line 1651 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if ((yyvsp[0].node) == nullptr) {
        ABORT_OOM
      }

      (yyval.node) = (yyvsp[0].node);
    }
#line 4190 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 205:
#line 1661 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueString((yyvsp[0].strval).value, (yyvsp[0].strval).length);
    }
#line 4198 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 206:
#line 1664 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = (yyvsp[0].node);
    }
#line 4206 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 207:
#line 1667 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueNull();
    }
#line 4214 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 208:
#line 1670 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueBool(true);
    }
#line 4222 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 209:
#line 1673 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeValueBool(false);
    }
#line 4230 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 210:
#line 1679 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeCollection((yyvsp[0].strval).value, TRI_TRANSACTION_WRITE);
    }
#line 4238 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 211:
#line 1682 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeCollection((yyvsp[0].strval).value, TRI_TRANSACTION_WRITE);
    }
#line 4246 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 212:
#line 1685 "Aql/grammar.y" /* yacc.c:1661  */
    {
      if ((yyvsp[0].strval).length < 2 || (yyvsp[0].strval).value[0] != '@') {
        parser->registerParseError(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE, TRI_errno_string(TRI_ERROR_QUERY_BIND_PARAMETER_TYPE), (yyvsp[0].strval).value, yylloc.first_line, yylloc.first_column);
      }

      (yyval.node) = parser->ast()->createNodeParameter((yyvsp[0].strval).value, (yyvsp[0].strval).length);
    }
#line 4258 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 213:
#line 1695 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.node) = parser->ast()->createNodeParameter((yyvsp[0].strval).value, (yyvsp[0].strval).length);
    }
#line 4266 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 214:
#line 1701 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.strval) = (yyvsp[0].strval);
    }
#line 4274 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 215:
#line 1704 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.strval) = (yyvsp[0].strval);
    }
#line 4282 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;

  case 216:
#line 1709 "Aql/grammar.y" /* yacc.c:1661  */
    {
      (yyval.strval) = (yyvsp[0].strval);
    }
#line 4290 "Aql/grammar.cpp" /* yacc.c:1661  */
    break;


#line 4294 "Aql/grammar.cpp" /* yacc.c:1661  */
      default: break;
    }
  /* User semantic actions sometimes alter yychar, and that requires
     that yytoken be updated with the new translation.  We take the
     approach of translating immediately before every use of yytoken.
     One alternative is translating here after every semantic action,
     but that translation would be missed if the semantic action invokes
     YYABORT, YYACCEPT, or YYERROR immediately after altering yychar or
     if it invokes YYBACKUP.  In the case of YYABORT or YYACCEPT, an
     incorrect destructor might then be invoked immediately.  In the
     case of YYERROR or YYBACKUP, subsequent parser actions might lead
     to an incorrect destructor call or verbose syntax error message
     before the lookahead is translated.  */
  YY_SYMBOL_PRINT ("-> $$ =", yyr1[yyn], &yyval, &yyloc);

  YYPOPSTACK (yylen);
  yylen = 0;
  YY_STACK_PRINT (yyss, yyssp);

  *++yyvsp = yyval;
  *++yylsp = yyloc;

  /* Now 'shift' the result of the reduction.  Determine what state
     that goes to, based on the state we popped back to and the rule
     number reduced by.  */

  yyn = yyr1[yyn];

  yystate = yypgoto[yyn - YYNTOKENS] + *yyssp;
  if (0 <= yystate && yystate <= YYLAST && yycheck[yystate] == *yyssp)
    yystate = yytable[yystate];
  else
    yystate = yydefgoto[yyn - YYNTOKENS];

  goto yynewstate;


/*--------------------------------------.
| yyerrlab -- here on detecting error.  |
`--------------------------------------*/
yyerrlab:
  /* Make sure we have latest lookahead translation.  See comments at
     user semantic actions for why this is necessary.  */
  yytoken = yychar == YYEMPTY ? YYEMPTY : YYTRANSLATE (yychar);

  /* If not already recovering from an error, report this error.  */
  if (!yyerrstatus)
    {
      ++yynerrs;
#if ! YYERROR_VERBOSE
      yyerror (&yylloc, parser, YY_("syntax error"));
#else
# define YYSYNTAX_ERROR yysyntax_error (&yymsg_alloc, &yymsg, \
                                        yyssp, yytoken)
      {
        char const *yymsgp = YY_("syntax error");
        int yysyntax_error_status;
        yysyntax_error_status = YYSYNTAX_ERROR;
        if (yysyntax_error_status == 0)
          yymsgp = yymsg;
        else if (yysyntax_error_status == 1)
          {
            if (yymsg != yymsgbuf)
              YYSTACK_FREE (yymsg);
            yymsg = (char *) YYSTACK_ALLOC (yymsg_alloc);
            if (!yymsg)
              {
                yymsg = yymsgbuf;
                yymsg_alloc = sizeof yymsgbuf;
                yysyntax_error_status = 2;
              }
            else
              {
                yysyntax_error_status = YYSYNTAX_ERROR;
                yymsgp = yymsg;
              }
          }
        yyerror (&yylloc, parser, yymsgp);
        if (yysyntax_error_status == 2)
          goto yyexhaustedlab;
      }
# undef YYSYNTAX_ERROR
#endif
    }

  yyerror_range[1] = yylloc;

  if (yyerrstatus == 3)
    {
      /* If just tried and failed to reuse lookahead token after an
         error, discard it.  */

      if (yychar <= YYEOF)
        {
          /* Return failure if at end of input.  */
          if (yychar == YYEOF)
            YYABORT;
        }
      else
        {
          yydestruct ("Error: discarding",
                      yytoken, &yylval, &yylloc, parser);
          yychar = YYEMPTY;
        }
    }

  /* Else will try to reuse lookahead token after shifting the error
     token.  */
  goto yyerrlab1;


/*---------------------------------------------------.
| yyerrorlab -- error raised explicitly by YYERROR.  |
`---------------------------------------------------*/
yyerrorlab:

  /* Pacify compilers like GCC when the user code never invokes
     YYERROR and the label yyerrorlab therefore never appears in user
     code.  */
  if (/*CONSTCOND*/ 0)
     goto yyerrorlab;

  yyerror_range[1] = yylsp[1-yylen];
  /* Do not reclaim the symbols of the rule whose action triggered
     this YYERROR.  */
  YYPOPSTACK (yylen);
  yylen = 0;
  YY_STACK_PRINT (yyss, yyssp);
  yystate = *yyssp;
  goto yyerrlab1;


/*-------------------------------------------------------------.
| yyerrlab1 -- common code for both syntax error and YYERROR.  |
`-------------------------------------------------------------*/
yyerrlab1:
  yyerrstatus = 3;      /* Each real token shifted decrements this.  */

  for (;;)
    {
      yyn = yypact[yystate];
      if (!yypact_value_is_default (yyn))
        {
          yyn += YYTERROR;
          if (0 <= yyn && yyn <= YYLAST && yycheck[yyn] == YYTERROR)
            {
              yyn = yytable[yyn];
              if (0 < yyn)
                break;
            }
        }

      /* Pop the current state because it cannot handle the error token.  */
      if (yyssp == yyss)
        YYABORT;

      yyerror_range[1] = *yylsp;
      yydestruct ("Error: popping",
                  yystos[yystate], yyvsp, yylsp, parser);
      YYPOPSTACK (1);
      yystate = *yyssp;
      YY_STACK_PRINT (yyss, yyssp);
    }

  YY_IGNORE_MAYBE_UNINITIALIZED_BEGIN
  *++yyvsp = yylval;
  YY_IGNORE_MAYBE_UNINITIALIZED_END

  yyerror_range[2] = yylloc;
  /* Using YYLLOC is tempting, but would change the location of
     the lookahead.  YYLOC is available though.  */
  YYLLOC_DEFAULT (yyloc, yyerror_range, 2);
  *++yylsp = yyloc;

  /* Shift the error token.  */
  YY_SYMBOL_PRINT ("Shifting", yystos[yyn], yyvsp, yylsp);

  yystate = yyn;
  goto yynewstate;


/*-------------------------------------.
| yyacceptlab -- YYACCEPT comes here.  |
`-------------------------------------*/
yyacceptlab:
  yyresult = 0;
  goto yyreturn;

/*-----------------------------------.
| yyabortlab -- YYABORT comes here.  |
`-----------------------------------*/
yyabortlab:
  yyresult = 1;
  goto yyreturn;

#if !defined yyoverflow || YYERROR_VERBOSE
/*-------------------------------------------------.
| yyexhaustedlab -- memory exhaustion comes here.  |
`-------------------------------------------------*/
yyexhaustedlab:
  yyerror (&yylloc, parser, YY_("memory exhausted"));
  yyresult = 2;
  /* Fall through.  */
#endif

yyreturn:
  if (yychar != YYEMPTY)
    {
      /* Make sure we have latest lookahead translation.  See comments at
         user semantic actions for why this is necessary.  */
      yytoken = YYTRANSLATE (yychar);
      yydestruct ("Cleanup: discarding lookahead",
                  yytoken, &yylval, &yylloc, parser);
    }
  /* Do not reclaim the symbols of the rule whose action triggered
     this YYABORT or YYACCEPT.  */
  YYPOPSTACK (yylen);
  YY_STACK_PRINT (yyss, yyssp);
  while (yyssp != yyss)
    {
      yydestruct ("Cleanup: popping",
                  yystos[*yyssp], yyvsp, yylsp, parser);
      YYPOPSTACK (1);
    }
#ifndef yyoverflow
  if (yyss != yyssa)
    YYSTACK_FREE (yyss);
#endif
#if YYERROR_VERBOSE
  if (yymsg != yymsgbuf)
    YYSTACK_FREE (yymsg);
#endif
  return yyresult;
}
