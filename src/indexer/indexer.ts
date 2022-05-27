import { PathLike, promises as fs } from 'fs'
import { strict as assert } from 'assert'
import { renderRootFiles } from './render-root'
import { renderSrcFiles } from './render-src'
import { Idl } from '..'
import {
  logError,
  prepareTargetDir,
  prependGeneratedWarning
} from '../solita/utils'

import { format, Options } from 'prettier'
import { Paths } from './paths'

const DEFAULT_FORMAT_OPTS: Options = {
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  useTabs: false,
  tabWidth: 2,
  arrowParens: 'always',
  printWidth: 80,
  parser: 'typescript',
}

export class Indexer {
  private readonly formatCode: boolean
  private readonly formatOpts: Options
  private readonly prependGeneratedWarning: boolean
  private paths:  undefined | Paths
  constructor(
    private readonly idl: Idl,
    {
      formatCode = false,
      formatOpts = {},
      prependGeneratedWarning = true,
    }: {
      formatCode?: boolean
      formatOpts?: Options
      prependGeneratedWarning?: boolean
    } = {}
  ) {
    this.formatCode = formatCode
    this.formatOpts = { ...DEFAULT_FORMAT_OPTS, ...formatOpts }
    this.prependGeneratedWarning = prependGeneratedWarning
  }

  async renderAndWriteTo(outputDir: PathLike) {
    this.paths = new Paths(outputDir)

    await this.writeRoot()
  }

  async writeRoot() {
    assert(this.paths != null, 'should have set paths')

    let { config, pkg, run, tsconfig } = renderRootFiles(this.idl.name)

    if (this.prependGeneratedWarning) {
      config = prependGeneratedWarning(config)
      run = prependGeneratedWarning(run)
    }
    if (this.formatCode) {
      try {
        config = format(config, this.formatOpts)
        run = format(run, this.formatOpts)
      } catch (err) {
        logError(`Failed to format a file from indexer root folder`)
        logError(err)
      }
    }

    await prepareTargetDir(this.paths.root)
    await fs.writeFile(this.paths.rootFile('config.ts'), config, 'utf8')
    await fs.writeFile(this.paths.rootFile('package.json'), pkg, 'utf8')
    await fs.writeFile(this.paths.rootFile('run.ts'), run, 'utf8')
    await fs.writeFile(this.paths.rootFile('tsconfig.json'), tsconfig, 'utf8')

    await this.writeSrc()
  }

  async writeSrc(){
    assert(this.paths != null, 'should have set paths')

    let { constants, solanarpc, types } = renderSrcFiles()

    if (this.prependGeneratedWarning) {
      constants = prependGeneratedWarning(constants)
      solanarpc = prependGeneratedWarning(solanarpc)
      types = prependGeneratedWarning(types)
    }
    if (this.formatCode) {
      try {
        constants = format(constants, this.formatOpts)
        solanarpc = format(solanarpc, this.formatOpts)
        types = format(types, this.formatOpts)
      } catch (err) {
        logError(`Failed to format a file from indexer src folder`)
        logError(err)
      }
    }

    await prepareTargetDir(this.paths.srcDir)
    await fs.writeFile(this.paths.srcFile('constants'), constants, 'utf8')
    await fs.writeFile(this.paths.srcFile('solanaRpc'), solanarpc, 'utf8')
    await fs.writeFile(this.paths.srcFile('types'), types, 'utf8')
    await this.writeDal()
    await this.writeDomain()
    await this.writeGraphql()
    await this.writeIndexers()
    await this.writeIndexers()
    await this.writeParsers()
    await this.writeUtils()
  }

  async writeDal() {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.dalDir)

    
  }
  async writeDomain() {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.domainDir)

    
  }
  async writeGraphql() {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.graphqlDir)

    
  }
  async writeIndexers() {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.indexersDir)

    
  }
  async writeParsers() {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.parsersDir)

    
  }
  async writeUtils() {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.utilsDir)

    
  }
}
