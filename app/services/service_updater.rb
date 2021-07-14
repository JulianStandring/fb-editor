class ServiceUpdater
  attr_reader :latest_metadata

  def initialize(latest_metadata)
    @latest_metadata = latest_metadata.to_h.deep_dup.deep_stringify_keys
  end

  def update
    version = MetadataApiClient::Version.create(
      service_id: latest_metadata['service_id'],
      payload: latest_metadata
    )

    return version.metadata unless version.errors?

    false
  end

  def create_flow
    latest_metadata['flow'] = service_flow_from_pages
    remove_start_page_steps
  end

  private

  def service_flow_from_pages
    latest_metadata['pages'].each_with_index.inject({}) do |hash, (page, index)|
      hash.merge(
        NewFlowPageGenerator.new(
          page_uuid: page['_uuid'],
          page_index: index,
          latest_metadata: latest_metadata
        ).to_metadata
      )
    end
  end

  def remove_start_page_steps
    latest_metadata['pages'][0] = latest_metadata['pages'][0].except('steps')
  end
end
